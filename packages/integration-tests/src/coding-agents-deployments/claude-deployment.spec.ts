import { AccountsHexa, accountsSchemas } from '@packmind/accounts';
import { User, Organization } from '@packmind/accounts/types';
import { RecipesHexa, recipesSchemas } from '@packmind/recipes';
import {
  Recipe,
  RecipeVersion,
  RecipeVersionId,
} from '@packmind/recipes/types';
import { StandardsHexa, standardsSchemas } from '@packmind/standards';
import {
  Standard,
  StandardVersion,
  StandardVersionId,
} from '@packmind/standards/types';
import { GitHexa, gitSchemas } from '@packmind/git';
import { JobsHexa } from '@packmind/jobs';
import { GitRepo, GitProviderVendors } from '@packmind/git/types';
import {
  HexaRegistry,
  IDeploymentPort,
  Target,
  createTargetId,
} from '@packmind/shared';
import { makeTestDatasource } from '@packmind/shared/test';
import {
  CodingAgentHexaFactory,
  DeployerService,
  ClaudeDeployer,
} from '@packmind/coding-agent';

import { DataSource } from 'typeorm';

// Mock only Configuration from @packmind/shared
jest.mock('@packmind/shared', () => {
  const actual = jest.requireActual('@packmind/shared');
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

describe('Claude Deployment Integration', () => {
  let accountsHexa: AccountsHexa;
  let recipesHexa: RecipesHexa;
  let standardsHexa: StandardsHexa;
  let gitHexa: GitHexa;
  let registry: HexaRegistry;
  let dataSource: DataSource;
  let codingAgentFactory: CodingAgentHexaFactory;
  let deployerService: DeployerService;

  let recipe: Recipe;
  let standard: Standard;
  let organization: Organization;
  let user: User;
  let gitRepo: GitRepo;

  beforeEach(async () => {
    // Create test datasource with all necessary schemas
    dataSource = await makeTestDatasource([
      ...accountsSchemas,
      ...recipesSchemas,
      ...standardsSchemas,
      ...gitSchemas,
    ]);
    await dataSource.initialize();
    await dataSource.synchronize();

    // Create HexaRegistry
    registry = new HexaRegistry();

    // Register hexas before initialization
    registry.register(JobsHexa);
    registry.register(GitHexa);
    registry.register(AccountsHexa);
    registry.register(RecipesHexa);
    registry.register(StandardsHexa);

    // Initialize the registry with the datasource
    registry.init(dataSource);
    await registry.initAsync();

    // Get initialized hexas
    accountsHexa = registry.get(AccountsHexa);
    recipesHexa = registry.get(RecipesHexa);
    standardsHexa = registry.get(StandardsHexa);
    gitHexa = registry.get(GitHexa);

    // Initialize coding agent factory with the registry
    codingAgentFactory = new CodingAgentHexaFactory(registry);
    deployerService = codingAgentFactory.getDeployerService();

    const mockDeploymentPort = {
      addTarget: jest.fn(),
    } as Partial<jest.Mocked<IDeploymentPort>> as jest.Mocked<IDeploymentPort>;

    gitHexa.setDeploymentsAdapter(mockDeploymentPort);

    gitHexa.setUserProvider(accountsHexa.getUserProvider());
    gitHexa.setOrganizationProvider(accountsHexa.getOrganizationProvider());

    // Create test data
    const signUpResult = await accountsHexa.signUpWithOrganization({
      organizationName: 'test organization',
      email: 'testuser@packmind.com',
      password: 's3cret!@',
    });
    user = signUpResult.user;
    organization = signUpResult.organization;

    // Create test recipe
    recipe = await recipesHexa.captureRecipe({
      name: 'Test Recipe',
      content: 'This is test recipe content for deployment',
      organizationId: organization.id,
      userId: user.id,
    });

    // Create test standard
    standard = await standardsHexa.createStandard({
      name: 'Test Standard',
      description: 'A test standard for deployment',
      rules: [
        { content: 'Use meaningful variable names' },
        { content: 'Write comprehensive tests' },
      ],
      organizationId: organization.id,
      userId: user.id,
      scope: 'backend',
    });

    // Create git provider and repository
    const gitProvider = await gitHexa.addGitProvider({
      userId: user.id,
      organizationId: organization.id,
      gitProvider: {
        source: GitProviderVendors.github,
        url: 'https://api.github.com',
        token: 'test-github-token',
      },
    });

    gitRepo = await gitHexa.addGitRepo({
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

  describe('when CLAUDE.md does not exist', () => {
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
      jest.spyOn(gitHexa, 'getFileFromRepo').mockResolvedValue(null);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('creates CLAUDE.md with recipes instructions only', async () => {
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
        ['claude'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const claudeFile = fileUpdates.createOrUpdate.find(
        (file) => file.path === 'CLAUDE.md',
      );

      expect(claudeFile).toBeDefined();
      if (claudeFile) {
        expect(claudeFile.content).toContain('# Packmind Recipes');
        expect(claudeFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
        expect(claudeFile.content).toContain('ALWAYS READ');
        expect(claudeFile.content).toContain(recipeVersions[0].name);
        expect(claudeFile.content).toContain('aiAgent: "Claude Code"');
        expect(claudeFile.content).toContain('gitRepo: "test-owner/test-repo"');

        // Should NOT contain standards content yet
        expect(claudeFile.content).not.toContain('## Packmind Standards');
      }
    });

    it('creates CLAUDE.md with standards instructions only', async () => {
      const standardVersions: StandardVersion[] = [
        {
          id: 'standard-version-1' as StandardVersionId,
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: standard.version,
          summary: 'Test standard for deployment',
          userId: user.id,
          scope: standard.scope,
        },
      ];

      const fileUpdates = await deployerService.aggregateStandardsDeployments(
        standardVersions,
        gitRepo,
        [defaultTarget],
        ['claude'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const claudeFile = fileUpdates.createOrUpdate.find(
        (file) => file.path === 'CLAUDE.md',
      );

      expect(claudeFile).toBeDefined();
      if (claudeFile) {
        expect(claudeFile.content).toContain('# Packmind Standards');
        expect(claudeFile.content).toContain(
          'Before starting your work, make sure to review the coding standards relevant to your current task',
        );
        expect(claudeFile.content).toContain('Test standard for deployment :');
        expect(claudeFile.content).toContain('* Use meaningful variable names');
        expect(claudeFile.content).toContain('* Write comprehensive tests');
        expect(claudeFile.content).toContain(
          'Full standard is available here for further request: [Test Standard](.packmind/standards/test-standard.md)',
        );

        // Should NOT contain recipes content yet
        expect(claudeFile.content).not.toContain('# Packmind Recipes');
      }
    });

    it('merges recipes and standards for combined deployment', async () => {
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

      const standardVersions: StandardVersion[] = [
        {
          id: 'standard-version-1' as StandardVersionId,
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: standard.version,
          summary: 'Test standard for deployment',
          userId: user.id,
          scope: standard.scope,
        },
      ];

      // Deploy recipes first
      const recipeUpdates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        [defaultTarget],
        ['claude'],
      );

      // Deploy standards second
      const standardsUpdates =
        await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['claude'],
        );

      // Simulate the file merging that DeployerService does
      const allUpdates = [recipeUpdates, standardsUpdates];
      const pathMap = new Map<string, string>();

      for (const update of allUpdates) {
        for (const file of update.createOrUpdate) {
          pathMap.set(file.path, file.content);
        }
      }

      // Since both write to the same file, the last one wins in this simulation
      // This demonstrates the issue that was fixed by implementing content checking
      expect(pathMap.size).toBe(1);
      expect(pathMap.has('CLAUDE.md')).toBe(true);

      // The final content should be from the standards deployment (last one wins)
      const finalContent = pathMap.get('CLAUDE.md');
      expect(finalContent).toBeDefined();
      if (finalContent) {
        expect(finalContent).toContain('# Packmind Standards');
      }
    });
  });

  describe('when CLAUDE.md already exists with complete instructions', () => {
    let defaultTarget: Target;
    const existingContent = `<!-- start: Packmind recipes -->
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
* aiAgent: "Claude Code"
* gitRepo: "test-owner/test-repo"
* target: "/"

**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**\`

## Available recipes

* [Test Recipe](.packmind/recipes/test-recipe.md): Test recipe for deployment
<!-- end: Packmind recipes -->
<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

## Standard: Test Standard

Test standard for deployment :
* Use meaningful variable names
* Write comprehensive tests

Full standard is available here for further request: [Test Standard](.packmind/standards/test-standard.md)
<!-- end: Packmind standards -->`;

    beforeEach(() => {
      // Create a default target for testing
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      // Mock GitHexa.getFileFromRepo to return existing content
      const existingFile = {
        content: existingContent,
        sha: 'abc123',
      };
      jest.spyOn(gitHexa, 'getFileFromRepo').mockResolvedValue(existingFile);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('does not modify CLAUDE.md with existing recipe instructions', async () => {
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
        ['claude'],
      );

      // No files should be updated since instructions already exist
      expect(fileUpdates.createOrUpdate).toHaveLength(0);
      expect(fileUpdates.delete).toHaveLength(0);
    });

    it('does not modify CLAUDE.md with existing standards instructions', async () => {
      const standardVersions: StandardVersion[] = [
        {
          id: 'standard-version-1' as StandardVersionId,
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: standard.version,
          summary: 'Test standard for deployment',
          userId: user.id,
          scope: standard.scope,
        },
      ];

      const fileUpdates = await deployerService.aggregateStandardsDeployments(
        standardVersions,
        gitRepo,
        [defaultTarget],
        ['claude'],
      );

      // No files should be updated since instructions already exist
      expect(fileUpdates.createOrUpdate).toHaveLength(0);
      expect(fileUpdates.delete).toHaveLength(0);
    });
  });

  describe('when CLAUDE.md exists but is missing recipe instructions', () => {
    let defaultTarget: Target;
    const partialContent = `# Some User Instructions

This is user-defined content that should be preserved.

## User Section

More user content here.

<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

## Standard: Test Standard

Test standard for deployment :
* Use meaningful variable names
* Write comprehensive tests

Full standard is available here for further request: [Test Standard](.packmind/standards/test-standard.md)
<!-- end: Packmind standards -->`;

    beforeEach(() => {
      // Create a default target for testing
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      // Mock GitHexa.getFileFromRepo to return partial content (missing recipe instructions)
      const existingFile = {
        content: partialContent,
        sha: 'def456',
      };
      jest.spyOn(gitHexa, 'getFileFromRepo').mockResolvedValue(existingFile);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('adds recipe instructions while preserving existing content', async () => {
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
        ['claude'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const claudeFile = fileUpdates.createOrUpdate[0];
      expect(claudeFile.path).toBe('CLAUDE.md');

      // Should preserve existing user content
      expect(claudeFile.content).toContain('# Some User Instructions');
      expect(claudeFile.content).toContain(
        'This is user-defined content that should be preserved.',
      );
      expect(claudeFile.content).toContain('## User Section');
      expect(claudeFile.content).toContain('More user content here.');

      // Should preserve existing standards instructions
      expect(claudeFile.content).toContain('# Packmind Standards');
      expect(claudeFile.content).toContain(
        'Before starting your work, make sure to review the coding standards relevant to your current task',
      );
      expect(claudeFile.content).toContain('* Use meaningful variable names');
      expect(claudeFile.content).toContain('* Write comprehensive tests');

      // Should add recipe instructions
      expect(claudeFile.content).toContain('# Packmind Recipes');
      expect(claudeFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
      expect(claudeFile.content).toContain('aiAgent: "Claude Code"');
      expect(claudeFile.content).toContain('gitRepo: "test-owner/test-repo"');
    });

    it('does not add standards instructions for existing configuration', async () => {
      const standardVersions: StandardVersion[] = [
        {
          id: 'standard-version-1' as StandardVersionId,
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: standard.version,
          summary: 'Test standard for deployment',
          userId: user.id,
          scope: standard.scope,
        },
      ];

      const fileUpdates = await deployerService.aggregateStandardsDeployments(
        standardVersions,
        gitRepo,
        [defaultTarget],
        ['claude'],
      );

      // No files should be updated since standards instructions already exist
      expect(fileUpdates.createOrUpdate).toHaveLength(0);
      expect(fileUpdates.delete).toHaveLength(0);
    });
  });

  describe('when CLAUDE.md exists but is missing standards instructions', () => {
    let defaultTarget: Target;
    const partialContent = `<!-- start: Packmind recipes -->
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
* aiAgent: "Claude Code"
* gitRepo: "test-owner/test-repo"
* target: "/"

**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**\`

## Available recipes

* [Test Recipe](.packmind/recipes/test-recipe.md): Test recipe for deployment
<!-- end: Packmind recipes -->

# Some User Content

User-defined instructions that should be preserved.`;

    beforeEach(() => {
      // Create a default target for testing
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      // Mock GitHexa.getFileFromRepo to return partial content (missing standards instructions)
      const existingFile = {
        content: partialContent,
        sha: 'ghi789',
      };
      jest.spyOn(gitHexa, 'getFileFromRepo').mockResolvedValue(existingFile);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('does not add recipe instructions for existing configuration', async () => {
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
        ['claude'],
      );

      // No files should be updated since recipe instructions already exist
      expect(fileUpdates.createOrUpdate).toHaveLength(0);
      expect(fileUpdates.delete).toHaveLength(0);
    });

    it('adds standards instructions while preserving existing content', async () => {
      const standardVersions: StandardVersion[] = [
        {
          id: 'standard-version-1' as StandardVersionId,
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: standard.version,
          summary: 'Test standard for deployment',
          userId: user.id,
          scope: standard.scope,
        },
      ];

      const fileUpdates = await deployerService.aggregateStandardsDeployments(
        standardVersions,
        gitRepo,
        [defaultTarget],
        ['claude'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const claudeFile = fileUpdates.createOrUpdate[0];
      expect(claudeFile.path).toBe('CLAUDE.md');

      // Should preserve existing recipe instructions
      expect(claudeFile.content).toContain('# Packmind Recipes');
      expect(claudeFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
      expect(claudeFile.content).toContain('aiAgent: "Claude Code"');
      expect(claudeFile.content).toContain('gitRepo: "test-owner/test-repo"');

      // Should preserve existing user content
      expect(claudeFile.content).toContain('# Some User Content');
      expect(claudeFile.content).toContain(
        'User-defined instructions that should be preserved.',
      );

      // Should add standards instructions
      expect(claudeFile.content).toContain('# Packmind Standards');
      expect(claudeFile.content).toContain(
        'Before starting your work, make sure to review the coding standards relevant to your current task',
      );
      expect(claudeFile.content).toContain('Test standard for deployment :');
      expect(claudeFile.content).toContain('* Use meaningful variable names');
      expect(claudeFile.content).toContain('* Write comprehensive tests');
      expect(claudeFile.content).toContain(
        'Full standard is available here for further request: [Test Standard](.packmind/standards/test-standard.md)',
      );
    });
  });

  describe('unit tests for ClaudeDeployer', () => {
    let defaultTarget: Target;
    let claudeDeployer: ClaudeDeployer;

    beforeEach(() => {
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      claudeDeployer = new ClaudeDeployer(standardsHexa, gitHexa);
    });

    it('handles empty recipe list gracefully', async () => {
      jest.spyOn(gitHexa, 'getFileFromRepo').mockResolvedValue(null);

      const fileUpdates = await claudeDeployer.deployRecipes(
        [],
        gitRepo,
        defaultTarget,
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const claudeFile = fileUpdates.createOrUpdate[0];
      expect(claudeFile.path).toBe('CLAUDE.md');
      expect(claudeFile.content).toContain('# Packmind Recipes');
      expect(claudeFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
    });

    it('handles empty standards list gracefully', async () => {
      jest.spyOn(gitHexa, 'getFileFromRepo').mockResolvedValue(null);

      const fileUpdates = await claudeDeployer.deployStandards(
        [],
        gitRepo,
        defaultTarget,
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const claudeFile = fileUpdates.createOrUpdate[0];
      expect(claudeFile.path).toBe('CLAUDE.md');
      expect(claudeFile.content).not.toContain('# Packmind Standards');
    });

    it('handles GitHexa errors gracefully', async () => {
      jest
        .spyOn(gitHexa, 'getFileFromRepo')
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

      const fileUpdates = await claudeDeployer.deployRecipes(
        recipeVersions,
        gitRepo,
        defaultTarget,
      );

      // Should still work despite the error, treating it as if file doesn't exist
      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const claudeFile = fileUpdates.createOrUpdate[0];
      expect(claudeFile.content).toContain('# Packmind Recipes');
      expect(claudeFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
    });
  });
});
