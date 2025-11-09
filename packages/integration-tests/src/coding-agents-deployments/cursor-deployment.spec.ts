import { AccountsHexa, accountsSchemas } from '@packmind/accounts';
import {
  CodingAgentHexaFactory,
  CursorDeployer,
  DeployerService,
} from '@packmind/coding-agent';
import { GitHexa, gitSchemas } from '@packmind/git';
import { JobsHexa } from '@packmind/jobs';
import { RecipesHexa, recipesSchemas } from '@packmind/recipes';
import {
  Recipe,
  RecipeVersion,
  RecipeVersionId,
} from '@packmind/recipes/types';
import { HexaRegistry } from '@packmind/node-utils';
import { Space, SpacesHexa, spacesSchemas } from '@packmind/spaces';
import { StandardsHexa, standardsSchemas } from '@packmind/standards';
import { makeTestDatasource } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  GitProviderVendors,
  GitRepo,
  IDeploymentPort,
  IStandardsPort,
  IGitPort,
  Organization,
  Standard,
  StandardVersion,
  StandardVersionId,
  Target,
  User,
  createTargetId,
} from '@packmind/types';
import { assert } from 'console';
import { DataSource } from 'typeorm';

jest.mock('@packmind/node-utils', () => {
  const actual = jest.requireActual('@packmind/node-utils');
  return {
    ...actual,
    Configuration: {
      getConfig: jest.fn().mockImplementation((key: string) => {
        if (key === 'ENCRYPTION_KEY') {
          return Promise.resolve('random-encryption-key-for-testing');
        }
        return Promise.resolve(null);
      }),
    },
  };
});

describe('Cursor Deployment Integration', () => {
  let accountsHexa: AccountsHexa;
  let recipesHexa: RecipesHexa;
  let standardsHexa: StandardsHexa;
  let spacesHexa: SpacesHexa;
  let gitHexa: GitHexa;
  let standardsPort: IStandardsPort;
  let gitPort: IGitPort;
  let registry: HexaRegistry;
  let dataSource: DataSource;
  let codingAgentFactory: CodingAgentHexaFactory;
  let deployerService: DeployerService;

  let recipe: Recipe;
  let standard: Standard;
  let organization: Organization;
  let user: User;
  let space: Space;
  let gitRepo: GitRepo;

  beforeEach(async () => {
    // Create test datasource with all necessary schemas
    dataSource = await makeTestDatasource([
      ...accountsSchemas,
      ...recipesSchemas,
      ...standardsSchemas,
      ...spacesSchemas,
      ...gitSchemas,
    ]);
    await dataSource.initialize();
    await dataSource.synchronize();

    // Create HexaRegistry
    registry = new HexaRegistry();

    // Register hexas before initialization
    // NOTE: SpacesHexa must be registered before AccountsHexa
    // because AccountsHexa needs SpacesPort to create default space during signup
    registry.register(JobsHexa);
    registry.register(GitHexa);
    registry.register(SpacesHexa);
    registry.register(AccountsHexa);
    registry.register(RecipesHexa);
    registry.register(StandardsHexa);

    // Initialize the registry with the datasource
    await registry.init(dataSource);

    // Get initialized hexas
    accountsHexa = registry.get(AccountsHexa);
    recipesHexa = registry.get(RecipesHexa);
    standardsHexa = registry.get(StandardsHexa);
    spacesHexa = registry.get(SpacesHexa);
    gitHexa = registry.get(GitHexa);

    // Initialize coding agent factory with logger
    codingAgentFactory = new CodingAgentHexaFactory(new PackmindLogger('test'));
    codingAgentFactory.initialize(registry);
    deployerService = codingAgentFactory.getDeployerService();

    const mockDeploymentPort = {
      addTarget: jest.fn(),
    } as Partial<jest.Mocked<IDeploymentPort>> as jest.Mocked<IDeploymentPort>;

    gitHexa.setDeploymentsAdapter(mockDeploymentPort);

    const accountsAdapter = accountsHexa.getAdapter();
    gitHexa.setAccountsAdapter(accountsAdapter);

    // Hexas are already initialized by registry.init(), but get adapters
    standardsPort = standardsHexa.getAdapter();
    gitPort = gitHexa.getAdapter();

    // Create test data
    const signUpResult = await accountsHexa
      .getAdapter()
      .signUpWithOrganization({
        organizationName: 'test organization',
        email: 'testuser@packmind.com',
        password: 's3cret!@',
      });
    user = signUpResult.user;
    organization = signUpResult.organization;

    // Get the default "Global" space created during signup
    const spaces = await spacesHexa
      .getAdapter()
      .listSpacesByOrganization(organization.id);
    const foundSpace = spaces.find((s) => s.name === 'Global');
    assert(foundSpace, 'Default Global space should exist');
    space = foundSpace;

    // Create test recipe
    recipe = await recipesHexa.getAdapter().captureRecipe({
      name: 'Test Recipe for Cursor',
      content: 'This is test recipe content for Cursor deployment',
      organizationId: organization.id,
      userId: user.id,
      spaceId: space.id.toString(),
    });

    // Create test standard
    standard = await standardsHexa.getAdapter().createStandard({
      name: 'Test Standard for Cursor',
      description: 'A test standard for Cursor deployment',
      rules: [
        { content: 'Use meaningful variable names in TypeScript' },
        { content: 'Write comprehensive tests for all components' },
      ],
      organizationId: organization.id,
      userId: user.id,
      scope: '**/*.{ts,tsx}',
      spaceId: space.id,
    });

    // Create git provider and repository
    const gitProvider = await gitHexa.getAdapter().addGitProvider({
      userId: user.id,
      organizationId: organization.id,
      gitProvider: {
        source: GitProviderVendors.github,
        url: 'https://api.github.com',
        token: 'test-github-token',
      },
    });

    gitRepo = await gitHexa.getAdapter().addGitRepo({
      userId: user.id,
      organizationId: organization.id,
      gitProviderId: gitProvider.id,
      owner: 'test-owner',
      repo: 'test-repo',
      branch: 'main',
    });
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  describe('when .cursor/rules/packmind/recipes-index.mdc does not exist', () => {
    let defaultTarget: Target;

    beforeEach(() => {
      // Create a default target for testing
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      // Mock GitHexa.getFileFromRepo to return null (file doesn't exist)
      // Mock gitPort.getFileFromRepo (gitPort is initialized in main beforeEach)
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('creates .cursor/rules/packmind/recipes-index.mdc with recipe summaries', async () => {
      const recipeVersions: RecipeVersion[] = [
        {
          id: 'recipe-version-1' as RecipeVersionId,
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: recipe.content,
          version: recipe.version,
          summary:
            'Test recipe for Cursor deployment with detailed instructions',
          userId: user.id,
        },
      ];

      const fileUpdates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        [defaultTarget],
        ['cursor'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const cursorFile = fileUpdates.createOrUpdate.find(
        (file) => file.path === '.cursor/rules/packmind/recipes-index.mdc',
      );

      expect(cursorFile).toBeDefined();
      if (cursorFile) {
        // Check Cursor front matter
        expect(cursorFile.content).toContain('---');
        expect(cursorFile.content).toContain('alwaysApply: true');

        // Check Packmind recipes header and instructions
        expect(cursorFile.content).toContain('# Packmind Recipes');
        expect(cursorFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
        expect(cursorFile.content).toContain('ALWAYS READ');
        expect(cursorFile.content).toContain('available recipes below');
        expect(cursorFile.content).toContain('aiAgent: "Cursor"');
        expect(cursorFile.content).toContain('gitRepo: "test-owner/test-repo"');

        // Check recipes list
        expect(cursorFile.content).toContain('## Available recipes');
        expect(cursorFile.content).toContain('Test Recipe for Cursor');
        expect(cursorFile.content).toContain(recipe.slug);
        expect(cursorFile.content).toContain(
          'Test recipe for Cursor deployment with detailed instructions',
        );
      }
    });

    it('creates multiple .cursor/rules/packmind/standard-*.mdc files for standards', async () => {
      const standardVersions: StandardVersion[] = [
        {
          id: 'standard-version-1' as StandardVersionId,
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: standard.version,
          summary: 'Test standard for Cursor deployment',
          userId: user.id,
          scope: standard.scope,
        },
      ];

      const fileUpdates = await deployerService.aggregateStandardsDeployments(
        standardVersions,
        gitRepo,
        [defaultTarget],
        ['cursor'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const cursorStandardFile = fileUpdates.createOrUpdate.find(
        (file) =>
          file.path === `.cursor/rules/packmind/standard-${standard.slug}.mdc`,
      );

      expect(cursorStandardFile).toBeDefined();
      if (cursorStandardFile) {
        // Check Cursor configuration format
        expect(cursorStandardFile.content).toContain('---');
        expect(cursorStandardFile.content).toContain('globs: **/*.{ts,tsx}');
        expect(cursorStandardFile.content).toContain('alwaysApply: false');
        expect(cursorStandardFile.content).toContain('---');
        expect(cursorStandardFile.content).toContain(
          'Test standard for Cursor deployment :',
        );
        expect(cursorStandardFile.content).toContain(
          '* Use meaningful variable names in TypeScript',
        );
        expect(cursorStandardFile.content).toContain(
          '* Write comprehensive tests for all components',
        );
        expect(cursorStandardFile.content).toContain(
          `Full standard is available here for further request: [${standard.name}](../../../.packmind/standards/${standard.slug}.md)`,
        );
      }
    });

    it('handles standard without scope (alwaysApply: true)', async () => {
      // Create a standard without scope
      const globalStandard = await standardsHexa.getAdapter().createStandard({
        name: 'Global Standard',
        description: 'A global standard without scope',
        rules: [{ content: 'Always use consistent formatting' }],
        organizationId: organization.id,
        userId: user.id,
        scope: '', // Empty scope
        spaceId: space.id,
      });

      const standardVersions: StandardVersion[] = [
        {
          id: 'standard-version-2' as StandardVersionId,
          standardId: globalStandard.id,
          name: globalStandard.name,
          slug: globalStandard.slug,
          description: globalStandard.description,
          version: globalStandard.version,
          summary: 'Global standard for all files',
          userId: user.id,
          scope: globalStandard.scope,
        },
      ];

      const fileUpdates = await deployerService.aggregateStandardsDeployments(
        standardVersions,
        gitRepo,
        [defaultTarget],
        ['cursor'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);

      const cursorStandardFile = fileUpdates.createOrUpdate[0];
      expect(cursorStandardFile.path).toBe(
        `.cursor/rules/packmind/standard-${globalStandard.slug}.mdc`,
      );

      // Should use alwaysApply: true when no scope
      expect(cursorStandardFile.content).toContain('alwaysApply: true');
      expect(cursorStandardFile.content).not.toContain('globs:');
      expect(cursorStandardFile.content).toContain(
        'Global standard for all files :',
      );
      expect(cursorStandardFile.content).toContain(
        '* Always use consistent formatting',
      );
      expect(cursorStandardFile.content).toContain(
        `Full standard is available here for further request: [${globalStandard.name}](../../../.packmind/standards/${globalStandard.slug}.md)`,
      );
    });

    it('combines recipes and standards deployments', async () => {
      const recipeVersions: RecipeVersion[] = [
        {
          id: 'recipe-version-1' as RecipeVersionId,
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: recipe.content,
          version: recipe.version,
          summary: 'Test recipe for combined deployment',
          userId: user.id,
        },
      ];

      const standardVersions: StandardVersion[] = [
        {
          id: 'standard-version-1' as StandardVersionId,
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: standard.version,
          summary: 'Test standard for combined deployment',
          userId: user.id,
          scope: standard.scope,
        },
      ];

      // Create a default target for testing
      const defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };

      // Deploy recipes
      const recipeUpdates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        [defaultTarget],
        ['cursor'],
      );

      // Deploy standards
      const standardsUpdates =
        await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['cursor'],
        );

      expect(recipeUpdates.createOrUpdate).toHaveLength(1);
      expect(standardsUpdates.createOrUpdate).toHaveLength(1);

      // Recipes should create .cursor/rules/packmind/recipes-index.mdc
      expect(recipeUpdates.createOrUpdate[0].path).toBe(
        '.cursor/rules/packmind/recipes-index.mdc',
      );

      // Standards should create .cursor/rules/packmind/standard-*.mdc
      expect(standardsUpdates.createOrUpdate[0].path).toBe(
        `.cursor/rules/packmind/standard-${standard.slug}.mdc`,
      );
    });
  });

  describe('when .cursor/rules/packmind/recipes-index.mdc already exists', () => {
    let defaultTarget: Target;
    const existingContent = `---
alwaysApply: true
---

# Packmind Recipes

🚨 **MANDATORY STEP** 🚨

Before writing, editing, or generating ANY code:

**ALWAYS READ**: the available recipes below to see what recipes are available

## Recipe Usage Rules:
- **MANDATORY**: Always check the recipes list first
- **CONDITIONAL**: Only read/use individual recipes if they are relevant to your task
- **OPTIONAL**: If no recipes are relevant, proceed without using any

## Recipe Usage Tracking:
When you DO use or apply a relevant Packmind recipe from .packmind/recipes/, you MUST call the 'packmind_notify_recipe_usage' MCP tool with:
* Recipe slugs array (e.g., ["recipe-name"] from "recipe-name.md")
* aiAgent: "Cursor"
* gitRepo: "test-owner/test-repo"
* target: "/"

**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**\`

## Available recipes

- [Test Recipe for Cursor](.packmind/recipes/test-recipe-for-cursor.md) : Test recipe for deployment`;

    beforeEach(async () => {
      // Hexas are already initialized by registry.init()
      const gitPort = gitHexa.getAdapter();

      // Create a default target for testing
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      // Mock gitPort.getFileFromRepo to return existing content
      const existingFile = {
        content: existingContent,
        sha: 'abc123',
      };
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(existingFile);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('does not modify existing .cursor/rules/packmind/recipes-index.mdc file', async () => {
      const recipeVersions: RecipeVersion[] = [
        {
          id: 'recipe-version-1' as RecipeVersionId,
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: recipe.content,
          version: recipe.version,
          summary: 'Test recipe for deployment',
          userId: user.id,
        },
      ];

      const fileUpdates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        [defaultTarget],
        ['cursor'],
      );

      // No files should be updated since instructions already exist
      expect(fileUpdates.createOrUpdate).toHaveLength(0);
      expect(fileUpdates.delete).toHaveLength(0);
    });
  });

  describe('unit tests for CursorDeployer', () => {
    let defaultTarget: Target;
    let cursorDeployer: CursorDeployer;

    beforeEach(async () => {
      // Hexas are already initialized by registry.init()
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      standardsPort = standardsHexa.getAdapter();
      gitPort = gitHexa.getAdapter();
      cursorDeployer = new CursorDeployer(standardsPort, gitPort);
    });

    it('handles empty recipe list gracefully', async () => {
      // Mock gitPort.getFileFromRepo (gitPort is initialized in main beforeEach)
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

      const fileUpdates = await cursorDeployer.deployRecipes(
        [],
        gitRepo,
        defaultTarget,
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const cursorFile = fileUpdates.createOrUpdate[0];
      expect(cursorFile.path).toBe('.cursor/rules/packmind/recipes-index.mdc');
      expect(cursorFile.content).toContain('# Packmind Recipes');
      expect(cursorFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
      expect(cursorFile.content).toContain(
        'No recipes are currently available',
      );
    });

    it('handles empty standards list gracefully', async () => {
      const fileUpdates = await cursorDeployer.deployStandards(
        [],
        gitRepo,
        defaultTarget,
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(0);
      expect(fileUpdates.delete).toHaveLength(0);
    });

    it('handles GitHexa errors gracefully', async () => {
      jest
        .spyOn(gitHexa.getAdapter(), 'getFileFromRepo')
        .mockRejectedValue(new Error('GitHub API error'));

      const recipeVersions: RecipeVersion[] = [
        {
          id: 'recipe-version-1' as RecipeVersionId,
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: recipe.content,
          version: recipe.version,
          summary: 'Test recipe',
          userId: user.id,
        },
      ];

      const fileUpdates = await cursorDeployer.deployRecipes(
        recipeVersions,
        gitRepo,
        defaultTarget,
      );

      // Should still work despite the error, treating it as if file doesn't exist
      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const cursorFile = fileUpdates.createOrUpdate[0];
      expect(cursorFile.content).toContain('# Packmind Recipes');
      expect(cursorFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
    });

    it('generates multiple standard files correctly', async () => {
      const standard1 = await standardsHexa.getAdapter().createStandard({
        name: 'Frontend Standard',
        description: 'Frontend coding standard',
        rules: [{ content: 'Use TypeScript' }],
        organizationId: organization.id,
        userId: user.id,
        scope: '**/*.{ts,tsx,js,jsx}',
        spaceId: space.id,
      });

      const standard2 = await standardsHexa.getAdapter().createStandard({
        name: 'Backend Standard',
        description: 'Backend coding standard',
        rules: [{ content: 'Use dependency injection' }],
        organizationId: organization.id,
        userId: user.id,
        scope: '', // No scope - applies to all files
        spaceId: space.id,
      });

      const standardVersions: StandardVersion[] = [
        {
          id: 'standard-version-1' as StandardVersionId,
          standardId: standard1.id,
          name: standard1.name,
          slug: standard1.slug,
          description: standard1.description,
          version: standard1.version,
          summary: 'Frontend standard',
          userId: user.id,
          scope: standard1.scope,
        },
        {
          id: 'standard-version-2' as StandardVersionId,
          standardId: standard2.id,
          name: standard2.name,
          slug: standard2.slug,
          description: standard2.description,
          version: standard2.version,
          summary: 'Backend standard',
          userId: user.id,
          scope: standard2.scope,
        },
      ];

      const fileUpdates = await cursorDeployer.deployStandards(
        standardVersions,
        gitRepo,
        defaultTarget,
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(2);

      // Check first standard (with scope)
      const frontendFile = fileUpdates.createOrUpdate.find((file) =>
        file.path.includes(standard1.slug),
      );
      expect(frontendFile).toBeDefined();
      if (frontendFile) {
        expect(frontendFile.content).toContain('globs: **/*.{ts,tsx,js,jsx}');
        expect(frontendFile.content).toContain('alwaysApply: false');
        expect(frontendFile.content).toContain('Frontend standard :');
        expect(frontendFile.content).toContain('* Use TypeScript');
        expect(frontendFile.content).toContain(
          `Full standard is available here for further request: [${standard1.name}](../../../.packmind/standards/${standard1.slug}.md)`,
        );
      }

      // Check second standard (no scope)
      const backendFile = fileUpdates.createOrUpdate.find((file) =>
        file.path.includes(standard2.slug),
      );
      expect(backendFile).toBeDefined();
      if (backendFile) {
        expect(backendFile.content).not.toContain('globs:');
        expect(backendFile.content).toContain('alwaysApply: true');
        expect(backendFile.content).toContain('Backend standard :');
        expect(backendFile.content).toContain('* Use dependency injection');
        expect(backendFile.content).toContain(
          `Full standard is available here for further request: [${standard2.name}](../../../.packmind/standards/${standard2.slug}.md)`,
        );
      }
    });
  });
});
