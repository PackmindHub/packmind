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
  JunieDeployer,
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

describe('Junie Deployment Integration', () => {
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

  describe('when .junie/guidelines.md does not exist', () => {
    beforeEach(() => {
      // Mock GitHexa.getFileFromRepo to return null (file doesn't exist)
      jest.spyOn(gitHexa, 'getFileFromRepo').mockResolvedValue(null);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('creates .junie/guidelines.md with recipes instructions only', async () => {
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
        ['junie'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const guidelinesFile = fileUpdates.createOrUpdate.find(
        (file) => file.path === '.junie/guidelines.md',
      );

      expect(guidelinesFile).toBeDefined();
      if (guidelinesFile) {
        expect(guidelinesFile.content).toContain('# Packmind Recipes');
        expect(guidelinesFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
        expect(guidelinesFile.content).toContain('ALWAYS READ');
        expect(guidelinesFile.content).toContain('.packmind/recipes-index.md');
        expect(guidelinesFile.content).toContain('aiAgent: "Junie"');
        expect(guidelinesFile.content).toContain(
          'gitRepo: "test-owner/test-repo"',
        );

        // Should NOT contain standards content yet
        expect(guidelinesFile.content).not.toContain('## Packmind Standards');
      }
    });

    it('create .junie/guidelines.md with standards instructions only', async () => {
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
        ['junie'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const guidelinesFile = fileUpdates.createOrUpdate.find(
        (file) => file.path === '.junie/guidelines.md',
      );

      expect(guidelinesFile).toBeDefined();
      if (guidelinesFile) {
        expect(guidelinesFile.content).toContain('## Packmind Standards');
        expect(guidelinesFile.content).toContain(
          'Follow the coding standards defined in',
        );
        expect(guidelinesFile.content).toContain(
          '.packmind/standards-index.md',
        );

        // Should NOT contain recipes content yet
        expect(guidelinesFile.content).not.toContain('# Packmind Recipes');
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
        ['junie'],
      );

      // Deploy standards second
      const standardsUpdates =
        await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          ['junie'],
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
      expect(pathMap.has('.junie/guidelines.md')).toBe(true);

      // The final content should be from the standards deployment (last one wins)
      const finalContent = pathMap.get('.junie/guidelines.md');
      expect(finalContent).toBeDefined();
      if (finalContent) {
        expect(finalContent).toContain('## Packmind Standards');
      }
    });
  });

  describe('when .junie/guidelines.md already exists with complete instructions', () => {
    const existingContent =
      '<!-- start: Packmind recipes -->\n' +
      '# Packmind Recipes\n' +
      '\n' +
      '🚨 **MANDATORY STEP** 🚨\n' +
      '\n' +
      'Before writing, editing, or generating ANY code:\n' +
      '\n' +
      '**ALWAYS READ**: [.packmind/recipes-index.md](.packmind/recipes-index.md) to see what recipes are available\n' +
      '\n' +
      '## Recipe Usage Rules:\n' +
      '- **MANDATORY**: Always check the recipes list first\n' +
      '- **CONDITIONAL**: Only read/use individual recipes if they are relevant to your task\n' +
      '- **OPTIONAL**: If no recipes are relevant, proceed without using any\n' +
      '\n' +
      '## Recipe Usage Tracking:\n' +
      "When you DO use or apply a relevant Packmind recipe from .packmind/recipes/, you MUST call the 'packmind_notify_recipe_usage' MCP tool with:\n" +
      '* Recipe slugs array (e.g., ["recipe-name"] from "recipe-name.md")\n' +
      '* aiAgent: "Junie"\n' +
      '* gitRepo: "test-owner/test-repo"\n' +
      '\n' +
      '**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**`\n' +
      '<!-- end: Packmind recipes -->\n' +
      '\n' +
      '## Packmind Standards\n' +
      '\n' +
      'Follow the coding standards defined in [.packmind/standards-index.md](.packmind/standards-index.md)';

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

    it('does not modify .junie/guidelines.md with existing recipe instructions', async () => {
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
        ['junie'],
      );

      // No files should be updated since instructions already exist
      expect(fileUpdates.createOrUpdate).toHaveLength(0);
      expect(fileUpdates.delete).toHaveLength(0);
    });

    it('does not modify .junie/guidelines.md with existing standards instructions', async () => {
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
        ['junie'],
      );

      // No files should be updated since instructions already exist
      expect(fileUpdates.createOrUpdate).toHaveLength(0);
      expect(fileUpdates.delete).toHaveLength(0);
    });
  });

  describe('when .junie/guidelines.md exists but is missing recipe instructions', () => {
    const partialContent = `# Some User Instructions

This is user-defined content that should be preserved.

## User Section

More user content here.

## Packmind Standards

Follow the coding standards defined in [.packmind/standards-index.md](.packmind/standards-index.md)`;

    beforeEach(() => {
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
        ['junie'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const guidelinesFile = fileUpdates.createOrUpdate[0];
      expect(guidelinesFile.path).toBe('.junie/guidelines.md');

      // Should preserve existing user content
      expect(guidelinesFile.content).toContain('# Some User Instructions');
      expect(guidelinesFile.content).toContain(
        'This is user-defined content that should be preserved.',
      );
      expect(guidelinesFile.content).toContain('## User Section');
      expect(guidelinesFile.content).toContain('More user content here.');

      // Should preserve existing standards instructions
      expect(guidelinesFile.content).toContain('## Packmind Standards');
      expect(guidelinesFile.content).toContain(
        'Follow the coding standards defined in',
      );

      // Should add recipe instructions
      expect(guidelinesFile.content).toContain('# Packmind Recipes');
      expect(guidelinesFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
      expect(guidelinesFile.content).toContain('aiAgent: "Junie"');
      expect(guidelinesFile.content).toContain(
        'gitRepo: "test-owner/test-repo"',
      );
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
        ['junie'],
      );

      // No files should be updated since standards instructions already exist
      expect(fileUpdates.createOrUpdate).toHaveLength(0);
      expect(fileUpdates.delete).toHaveLength(0);
    });
  });

  describe('when .junie/guidelines.md exists but is missing standards instructions', () => {
    const partialContent =
      '<!-- start: Packmind recipes -->\n' +
      '# Packmind Recipes\n' +
      '\n' +
      '🚨 **MANDATORY STEP** 🚨\n' +
      '\n' +
      'Before writing, editing, or generating ANY code:\n' +
      '\n' +
      '**ALWAYS READ**: [.packmind/recipes-index.md](.packmind/recipes-index.md) to see what recipes are available\n' +
      '\n' +
      '## Recipe Usage Rules:\n' +
      '- **MANDATORY**: Always check the recipes list first\n' +
      '- **CONDITIONAL**: Only read/use individual recipes if they are relevant to your task\n' +
      '- **OPTIONAL**: If no recipes are relevant, proceed without using any\n' +
      '\n' +
      '## Recipe Usage Tracking:\n' +
      "When you DO use or apply a relevant Packmind recipe from .packmind/recipes/, you MUST call the 'packmind_notify_recipe_usage' MCP tool with:\n" +
      '* Recipe slugs array (e.g., ["recipe-name"] from "recipe-name.md")\n' +
      '* aiAgent: "Junie"\n' +
      '* gitRepo: "test-owner/test-repo"\n' +
      '\n' +
      '**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**`\n' +
      '<!-- end: Packmind recipes -->\n' +
      '\n' +
      '# Some User Content\n' +
      '\n' +
      'User-defined instructions that should be preserved.';

    beforeEach(() => {
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
        ['junie'],
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
        ['junie'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const guidelinesFile = fileUpdates.createOrUpdate[0];
      expect(guidelinesFile.path).toBe('.junie/guidelines.md');

      // Should preserve existing recipe instructions
      expect(guidelinesFile.content).toContain('# Packmind Recipes');
      expect(guidelinesFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
      expect(guidelinesFile.content).toContain('aiAgent: "Junie"');
      expect(guidelinesFile.content).toContain(
        'gitRepo: "test-owner/test-repo"',
      );

      // Should preserve existing user content
      expect(guidelinesFile.content).toContain('# Some User Content');
      expect(guidelinesFile.content).toContain(
        'User-defined instructions that should be preserved.',
      );

      // Should add standards instructions
      expect(guidelinesFile.content).toContain('## Packmind Standards');
      expect(guidelinesFile.content).toContain(
        'Follow the coding standards defined in',
      );
      expect(guidelinesFile.content).toContain('.packmind/standards-index.md');
    });
  });

  describe('unit tests for JunieDeployer', () => {
    let junieDeployer: JunieDeployer;

    beforeEach(() => {
      junieDeployer = new JunieDeployer(gitHexa);
    });

    it('handles empty recipe list gracefully', async () => {
      jest.spyOn(gitHexa, 'getFileFromRepo').mockResolvedValue(null);

      const fileUpdates = await junieDeployer.deployRecipes([], gitRepo);

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const guidelinesFile = fileUpdates.createOrUpdate[0];
      expect(guidelinesFile.path).toBe('.junie/guidelines.md');
      expect(guidelinesFile.content).toContain('# Packmind Recipes');
      expect(guidelinesFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
    });

    it('handles empty standards list gracefully', async () => {
      jest.spyOn(gitHexa, 'getFileFromRepo').mockResolvedValue(null);

      const fileUpdates = await junieDeployer.deployStandards([], gitRepo);

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const guidelinesFile = fileUpdates.createOrUpdate[0];
      expect(guidelinesFile.path).toBe('.junie/guidelines.md');
      expect(guidelinesFile.content).toContain('## Packmind Standards');
      expect(guidelinesFile.content).toContain(
        'Follow the coding standards defined in',
      );
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

      const fileUpdates = await junieDeployer.deployRecipes(
        recipeVersions,
        gitRepo,
      );

      // Should still work despite the error, treating it as if file doesn't exist
      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const guidelinesFile = fileUpdates.createOrUpdate[0];
      expect(guidelinesFile.content).toContain('# Packmind Recipes');
      expect(guidelinesFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
    });
  });
});
