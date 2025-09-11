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
import { GitRepo, GitProviderVendors } from '@packmind/git/types';
import { HexaRegistry } from '@packmind/shared';
import { makeTestDatasource } from '@packmind/shared/test';
import {
  CodingAgentHexaFactory,
  DeployerService,
  CopilotDeployer,
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

describe('GitHub Copilot Deployment Integration', () => {
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
    registry.register(GitHexa);
    registry.register(AccountsHexa);
    registry.register(RecipesHexa);
    registry.register(StandardsHexa);

    // Initialize the registry with the datasource
    registry.init(dataSource);

    // Get initialized hexas
    accountsHexa = registry.get(AccountsHexa);
    recipesHexa = registry.get(RecipesHexa);
    standardsHexa = registry.get(StandardsHexa);
    gitHexa = registry.get(GitHexa);

    // Initialize coding agent factory with the registry
    codingAgentFactory = new CodingAgentHexaFactory(registry);
    deployerService = codingAgentFactory.getDeployerService();

    // Create test data
    organization = await accountsHexa.createOrganization({
      name: 'test organization',
    });

    user = await accountsHexa.signUpUser({
      username: 'testuser',
      password: 's3cret',
      organizationId: organization.id,
    });

    // Create test recipe
    recipe = await recipesHexa.captureRecipe({
      name: 'Test Recipe for Copilot',
      content: 'This is test recipe content for GitHub Copilot deployment',
      organizationId: organization.id,
      userId: user.id,
    });

    // Create test standard
    standard = await standardsHexa.createStandard({
      name: 'Test Standard for Copilot',
      description: 'A test standard for GitHub Copilot deployment',
      rules: [
        { content: 'Use meaningful variable names in JavaScript' },
        { content: 'Write comprehensive tests for all functions' },
      ],
      organizationId: organization.id,
      userId: user.id,
      scope: '**/*.{js,ts}',
    });

    // Create git provider and repository
    const gitProvider = await gitHexa.addGitProvider(
      {
        organizationId: organization.id,
        source: GitProviderVendors.github,
        url: 'https://api.github.com',
        token: 'test-github-token',
      },
      organization.id,
    );

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

  describe('when .github/instructions/packmind-recipes-index.instructions.md does not exist', () => {
    beforeEach(() => {
      // Mock GitHexa.getFileFromRepo to return null (file doesn't exist)
      jest.spyOn(gitHexa, 'getFileFromRepo').mockResolvedValue(null);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('creates .github/instructions/packmind-recipes-index.instructions.md with recipe summaries', async () => {
      const recipeVersions: RecipeVersion[] = [
        {
          id: 'recipe-version-1' as RecipeVersionId,
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: recipe.content,
          version: recipe.version,
          summary:
            'Test recipe for GitHub Copilot deployment with detailed instructions',
          userId: user.id,
        },
      ];

      const fileUpdates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        ['copilot'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const copilotFile = fileUpdates.createOrUpdate.find(
        (file) =>
          file.path ===
          '.github/instructions/packmind-recipes-index.instructions.md',
      );

      expect(copilotFile).toBeDefined();
      if (copilotFile) {
        // Check Copilot front matter
        expect(copilotFile.content).toContain('---');
        expect(copilotFile.content).toContain("applyTo: '**'");

        // Check Packmind recipes header and instructions
        expect(copilotFile.content).toContain('# Packmind Recipes');
        expect(copilotFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
        expect(copilotFile.content).toContain('ALWAYS READ');
        expect(copilotFile.content).toContain('available recipes below');
        expect(copilotFile.content).toContain('aiAgent: "GitHub Copilot"');
        expect(copilotFile.content).toContain(
          'gitRepo: "test-owner/test-repo"',
        );

        // Check recipes list
        expect(copilotFile.content).toContain('## Available Recipes');
        expect(copilotFile.content).toContain('Test Recipe for Copilot');
        expect(copilotFile.content).toContain(recipe.slug);
        expect(copilotFile.content).toContain(
          'Test recipe for GitHub Copilot deployment with detailed instructions',
        );
      }
    });

    it('creates multiple .github/instructions/packmind-*.instructions.md files for standards', async () => {
      const standardVersions: StandardVersion[] = [
        {
          id: 'standard-version-1' as StandardVersionId,
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: standard.version,
          summary: 'Test standard for GitHub Copilot deployment',
          userId: user.id,
          scope: standard.scope,
        },
      ];

      const fileUpdates = await deployerService.aggregateStandardsDeployments(
        standardVersions,
        gitRepo,
        ['copilot'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const copilotStandardFile = fileUpdates.createOrUpdate.find(
        (file) =>
          file.path ===
          `.github/instructions/packmind-${standard.slug}.instructions.md`,
      );

      expect(copilotStandardFile).toBeDefined();
      if (copilotStandardFile) {
        // Check Copilot configuration format
        expect(copilotStandardFile.content).toContain('---');
        expect(copilotStandardFile.content).toContain(
          "applyTo: '**/*.{js,ts}'",
        );
        expect(copilotStandardFile.content).toContain('---');
        expect(copilotStandardFile.content).toContain(
          `Apply the coding rules described #file:../../.packmind/standards/${standard.slug}.md`,
        );
      }
    });

    it('handles standard without scope (uses ** as default)', async () => {
      // Create a standard without scope
      const globalStandard = await standardsHexa.createStandard({
        name: 'Global Standard',
        description: 'A global standard without scope',
        rules: [{ content: 'Always use consistent formatting' }],
        organizationId: organization.id,
        userId: user.id,
        scope: '', // Empty scope
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
        ['copilot'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);

      const copilotStandardFile = fileUpdates.createOrUpdate[0];
      expect(copilotStandardFile.path).toBe(
        `.github/instructions/packmind-${globalStandard.slug}.instructions.md`,
      );

      // Should use ** when no scope
      expect(copilotStandardFile.content).toContain("applyTo: '**'");
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

      // Deploy recipes
      const recipeUpdates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        ['copilot'],
      );

      // Deploy standards
      const standardsUpdates =
        await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          ['copilot'],
        );

      expect(recipeUpdates.createOrUpdate).toHaveLength(1);
      expect(standardsUpdates.createOrUpdate).toHaveLength(1);

      // Recipes should create .github/instructions/packmind-recipes-index.instructions.md
      expect(recipeUpdates.createOrUpdate[0].path).toBe(
        '.github/instructions/packmind-recipes-index.instructions.md',
      );

      // Standards should create .github/instructions/packmind-*.instructions.md
      expect(standardsUpdates.createOrUpdate[0].path).toBe(
        `.github/instructions/packmind-${standard.slug}.instructions.md`,
      );
    });
  });

  describe('when .github/instructions/packmind-recipes-index.instructions.md already exists', () => {
    const existingContent =
      '---\n' +
      "applyTo: '**'\n" +
      '---\n' +
      '\n' +
      '# Packmind Recipes\n' +
      '\n' +
      '🚨 **MANDATORY STEP** 🚨\n' +
      '\n' +
      'Before writing, editing, or generating ANY code:\n' +
      '\n' +
      '**ALWAYS READ**: the available recipes below to see what recipes are available\n' +
      '\n' +
      '## Recipe Usage Rules:\n' +
      '- **MANDATORY**: Always check the recipes list first\n' +
      '- **CONDITIONAL**: Only read/use individual recipes if they are relevant to your task\n' +
      '- **OPTIONAL**: If no recipes are relevant, proceed without using any\n' +
      '\n' +
      '## Recipe Usage Tracking:\n' +
      "When you DO use or apply a relevant Packmind recipe from .packmind/recipes/, you MUST call the 'packmind_notify_recipe_usage' MCP tool with:\n" +
      '* Recipe slugs array (e.g., ["recipe-name"] from "recipe-name.md")\n' +
      '* aiAgent: "GitHub Copilot"\n' +
      '* gitRepo: "test-owner/test-repo"\n' +
      '\n' +
      '**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**`\n' +
      '\n' +
      '## Available Recipes\n' +
      '\n' +
      '- [Test Recipe for Copilot](.packmind/recipes/test-recipe-for-copilot.md) : Test recipe for deployment';

    beforeEach(() => {
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

    it('does not modify existing .github/instructions/packmind-recipes-index.instructions.md file', async () => {
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
        ['copilot'],
      );

      // No files should be updated since instructions already exist
      expect(fileUpdates.createOrUpdate).toHaveLength(0);
      expect(fileUpdates.delete).toHaveLength(0);
    });
  });

  describe('unit tests for CopilotDeployer', () => {
    let copilotDeployer: CopilotDeployer;

    beforeEach(() => {
      copilotDeployer = new CopilotDeployer(gitHexa);
    });

    it('handles empty recipe list gracefully', async () => {
      jest.spyOn(gitHexa, 'getFileFromRepo').mockResolvedValue(null);

      const fileUpdates = await copilotDeployer.deployRecipes([], gitRepo);

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const copilotFile = fileUpdates.createOrUpdate[0];
      expect(copilotFile.path).toBe(
        '.github/instructions/packmind-recipes-index.instructions.md',
      );
      expect(copilotFile.content).toContain('# Packmind Recipes');
      expect(copilotFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
      expect(copilotFile.content).toContain(
        'No recipes are currently available',
      );
    });

    it('handles empty standards list gracefully', async () => {
      const fileUpdates = await copilotDeployer.deployStandards([], gitRepo);

      expect(fileUpdates.createOrUpdate).toHaveLength(0);
      expect(fileUpdates.delete).toHaveLength(0);
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

      const fileUpdates = await copilotDeployer.deployRecipes(
        recipeVersions,
        gitRepo,
      );

      // Should still work despite the error, treating it as if file doesn't exist
      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const copilotFile = fileUpdates.createOrUpdate[0];
      expect(copilotFile.content).toContain('# Packmind Recipes');
      expect(copilotFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
    });

    it('generates multiple standard files correctly', async () => {
      const standard1 = await standardsHexa.createStandard({
        name: 'Frontend Standard',
        description: 'Frontend coding standard',
        rules: [{ content: 'Use TypeScript' }],
        organizationId: organization.id,
        userId: user.id,
        scope: '**/*.{ts,tsx,js,jsx}',
      });

      const standard2 = await standardsHexa.createStandard({
        name: 'Backend Standard',
        description: 'Backend coding standard',
        rules: [{ content: 'Use dependency injection' }],
        organizationId: organization.id,
        userId: user.id,
        scope: '', // No scope - uses **
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

      const fileUpdates = await copilotDeployer.deployStandards(
        standardVersions,
        gitRepo,
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(2);

      // Check first standard (with scope)
      const frontendFile = fileUpdates.createOrUpdate.find((file) =>
        file.path.includes(standard1.slug),
      );
      expect(frontendFile).toBeDefined();
      if (frontendFile) {
        expect(frontendFile.content).toContain(
          "applyTo: '**/*.{ts,tsx,js,jsx}'",
        );
      }

      // Check second standard (no scope - uses **)
      const backendFile = fileUpdates.createOrUpdate.find((file) =>
        file.path.includes(standard2.slug),
      );
      expect(backendFile).toBeDefined();
      if (backendFile) {
        expect(backendFile.content).toContain("applyTo: '**'");
      }
    });
  });
});
