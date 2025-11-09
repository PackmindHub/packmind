import { AccountsHexa, accountsSchemas } from '@packmind/accounts';
import { Organization, User } from '@packmind/types';
import {
  CodingAgentHexa,
  CodingAgentHexaFactory,
  DeployerService,
} from '@packmind/coding-agent';
import { DeploymentsHexa, deploymentsSchemas } from '@packmind/deployments';
import { GitHexa, GitRepo, createGitRepoId, gitSchemas } from '@packmind/git';
import { JobsHexa } from '@packmind/jobs';
import {
  Recipe,
  RecipeVersion,
  RecipeVersionId,
  RecipesHexa,
  recipesSchemas,
} from '@packmind/recipes';
import { HexaRegistry } from '@packmind/node-utils';
import { Space, SpacesHexa, spacesSchemas } from '@packmind/spaces';
import {
  Standard,
  StandardVersion,
  StandardVersionId,
  StandardsHexa,
  standardsSchemas,
} from '@packmind/standards';
import { makeTestDatasource } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import { Target, createGitProviderId, createTargetId } from '@packmind/types';
import { assert } from 'console';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

// Mock the Git provider adapter for file retrieval
jest.mock('@packmind/git', () => {
  const actual = jest.requireActual('@packmind/git');
  return {
    ...actual,
    GitProviderAdapter: jest.fn().mockImplementation(() => ({
      getFileFromRepo: jest.fn().mockImplementation((key: string) => {
        // Return null to simulate file doesn't exist
        if (key.includes('nonexistent')) {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      }),
    })),
  };
});

describe('Target-Specific Deployment Integration', () => {
  let accountsHexa: AccountsHexa;
  let recipesHexa: RecipesHexa;
  let standardsHexa: StandardsHexa;
  let spacesHexa: SpacesHexa;
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
  let jetbrainsTarget: Target;
  let vscodeTarget: Target;
  let rootTarget: Target;

  beforeEach(async () => {
    // Create test datasource with all necessary schemas
    dataSource = await makeTestDatasource([
      ...accountsSchemas,
      ...recipesSchemas,
      ...standardsSchemas,
      ...spacesSchemas,
      ...gitSchemas,
      ...deploymentsSchemas,
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
    registry.register(CodingAgentHexa);
    registry.register(DeploymentsHexa);

    // Initialize the registry with the datasource
    await registry.init(dataSource);

    // Get initialized hexas
    accountsHexa = registry.get(AccountsHexa);
    recipesHexa = registry.get(RecipesHexa);
    standardsHexa = registry.get(StandardsHexa);
    spacesHexa = registry.get(SpacesHexa);

    // Initialize coding agent factory with logger
    codingAgentFactory = new CodingAgentHexaFactory(new PackmindLogger('test'));
    codingAgentFactory.initialize(registry);
    deployerService = codingAgentFactory.getDeployerService();

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

    // Create test git repository (ide-plugins)
    gitRepo = {
      id: createGitRepoId(uuidv4()),
      owner: 'PackmindHub',
      repo: 'ide-plugins',
      branch: 'main',
      providerId: createGitProviderId('github-provider-id'),
    };

    // Create test recipe about JetBrains services
    recipe = await recipesHexa.getAdapter().captureRecipe({
      name: 'Writing Good JetBrains Services',
      content: `# Writing Good JetBrains Services

## Overview
This recipe provides best practices for writing services in JetBrains IDEs.

## Best Practices
1. Use dependency injection
2. Implement proper lifecycle management
3. Handle threading correctly
4. Follow JetBrains service patterns

## Example
\`\`\`kotlin
@Service
class MyService {
    fun doSomething() {
        // Implementation
    }
}
\`\`\`
`,
      userId: user.id,
      organizationId: organization.id,
      spaceId: space.id.toString(),
    });

    // Create test standard about code quality
    standard = await standardsHexa.getAdapter().createStandard({
      name: 'IDE Code Quality Standards',
      description:
        'Standards for maintaining high code quality across IDE plugins',
      rules: [
        { content: 'Always use meaningful variable names' },
        { content: 'Write unit tests for all public methods' },
        { content: 'Follow consistent indentation (2 or 4 spaces)' },
      ],
      organizationId: organization.id,
      userId: user.id,
      scope: 'ide-plugins',
      spaceId: space.id,
    });

    // Create targets for the repository
    jetbrainsTarget = {
      id: createTargetId(uuidv4()),
      name: 'jetbrains',
      path: '/jetbrains/',
      gitRepoId: gitRepo.id,
    };

    vscodeTarget = {
      id: createTargetId(uuidv4()),
      name: 'vscode',
      path: '/vscode/',
      gitRepoId: gitRepo.id,
    };

    rootTarget = {
      id: createTargetId(uuidv4()),
      name: 'root',
      path: '/',
      gitRepoId: gitRepo.id,
    };
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  describe('Standards Publishing: Example Mapping Scenario 1: Standard distributed to jetbrains target', () => {
    it('deploys standard to jetbrains/.packmind/standards path', async () => {
      // Create standard version
      const standardVersions: StandardVersion[] = [
        {
          id: 'standard-version-1' as StandardVersionId,
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: standard.version,
          summary: 'IDE code quality standards',
          userId: user.id,
          scope: standard.scope,
        },
      ];

      // Deploy to jetbrains target only
      const standardUpdates =
        await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [jetbrainsTarget], // Only jetbrains target
          ['packmind'], // Deploy to Packmind agent
        );

      expect(standardUpdates.createOrUpdate).toHaveLength(2);

      // Verify individual standard file is created in jetbrains path
      const standardFile = standardUpdates.createOrUpdate.find((file) =>
        file.path.includes('standards/ide-code-quality-standards.md'),
      );
      expect(standardFile).toBeDefined();
      expect(standardFile?.path).toBe(
        'jetbrains/.packmind/standards/ide-code-quality-standards.md',
      );
      expect(standardFile?.content).toContain('IDE Code Quality Standards');

      // Verify standards index file is created in jetbrains path
      const indexFile = standardUpdates.createOrUpdate.find(
        (file) => file.path === 'jetbrains/.packmind/standards-index.md',
      );
      expect(indexFile).toBeDefined();
      expect(indexFile?.content).toContain('IDE Code Quality Standards');
      expect(indexFile?.content).toContain('ide-code-quality-standards.md');
    });

    it('deploys standard to jetbrains path for Claude agent', async () => {
      const standardVersions: StandardVersion[] = [
        {
          id: 'standard-version-1' as StandardVersionId,
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: standard.version,
          summary: 'IDE code quality standards',
          userId: user.id,
          scope: standard.scope,
        },
      ];

      // Deploy to jetbrains target for Claude
      const standardUpdates =
        await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [jetbrainsTarget],
          ['claude'],
        );

      expect(standardUpdates.createOrUpdate).toHaveLength(1);

      // Verify Claude file is deployed to jetbrains/CLAUDE.md
      const deployedFile = standardUpdates.createOrUpdate[0];
      expect(deployedFile.path).toBe('jetbrains/CLAUDE.md');
      // Claude deployer creates a general template for standards, not specific standard content
      expect(deployedFile.content).toContain('Packmind Standards');
      expect(deployedFile.content).toContain(standard.name);
    });

    it('deploys standard to jetbrains path for Cursor agent', async () => {
      const standardVersions: StandardVersion[] = [
        {
          id: 'standard-version-1' as StandardVersionId,
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: standard.version,
          summary: 'IDE code quality standards',
          userId: user.id,
          scope: standard.scope,
        },
      ];

      // Deploy to jetbrains target for Cursor
      const standardUpdates =
        await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [jetbrainsTarget],
          ['cursor'],
        );

      expect(standardUpdates.createOrUpdate).toHaveLength(1);

      // Verify Cursor file is deployed to jetbrains/.cursor/rules/packmind/standard-*.mdc
      const deployedFile = standardUpdates.createOrUpdate[0];
      expect(deployedFile.path).toBe(
        'jetbrains/.cursor/rules/packmind/standard-ide-code-quality-standards.mdc',
      );

      expect(deployedFile.content).toContain(standard.name);
      expect(deployedFile.content).toContain('IDE code quality standards :');
      expect(deployedFile.content).toContain(
        '* Always use meaningful variable names',
      );
      expect(deployedFile.content).toContain(
        '* Write unit tests for all public methods',
      );
      expect(deployedFile.content).toContain(
        '* Follow consistent indentation (2 or 4 spaces)',
      );
      expect(deployedFile.content).toContain(
        'Full standard is available here for further request: [IDE Code Quality Standards](../../../.packmind/standards/ide-code-quality-standards.md)',
      );
    });
  });

  describe('Standards Publishing: Example Mapping Scenario 2: Standard isolation', () => {
    it('standard distributed to jetbrains target does not appear in vscode deployment', async () => {
      const jetbrainsStandardVersions: StandardVersion[] = [
        {
          id: 'jetbrains-standard-version-1' as StandardVersionId,
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: standard.version,
          summary: 'IDE code quality standards',
          userId: user.id,
          scope: standard.scope,
        },
      ];

      // Deploy to jetbrains target
      const jetbrainsUpdates =
        await deployerService.aggregateStandardsDeployments(
          jetbrainsStandardVersions,
          gitRepo,
          [jetbrainsTarget],
          ['packmind'],
        );

      // Simulate VSCode deployment with empty standards
      const vscodeUpdates = await deployerService.aggregateStandardsDeployments(
        [], // No standards for VSCode target
        gitRepo,
        [vscodeTarget],
        ['packmind'],
      );

      // Verify jetbrains deployment exists with both standard and index files
      expect(jetbrainsUpdates.createOrUpdate).toHaveLength(2);

      const jetbrainsStandardFile = jetbrainsUpdates.createOrUpdate.find(
        (file) => file.path.includes('standards/ide-code-quality-standards.md'),
      );
      expect(jetbrainsStandardFile).toBeDefined();
      expect(jetbrainsStandardFile?.path.startsWith('jetbrains/')).toBe(true);
      expect(jetbrainsStandardFile?.content).toContain(
        'IDE Code Quality Standards',
      );

      // Verify vscode deployment creates empty index (no actual standards, but still creates index file)
      expect(vscodeUpdates.createOrUpdate).toHaveLength(1);
      expect(vscodeUpdates.createOrUpdate[0].path).toBe(
        'vscode/.packmind/standards-index.md',
      );
      expect(vscodeUpdates.createOrUpdate[0].content).toContain(
        'No standards available',
      );

      // Verify the paths are completely separate
      const jetbrainsIndexFile = jetbrainsUpdates.createOrUpdate.find(
        (file) => file.path === 'jetbrains/.packmind/standards-index.md',
      );
      expect(jetbrainsIndexFile).toBeDefined();
      expect(jetbrainsIndexFile?.path.startsWith('jetbrains/')).toBe(true);
      expect(jetbrainsIndexFile?.path).not.toContain('vscode');
    });
  });

  describe('Standards Publishing: Example Mapping Scenario 3: Standard distributed to multiple targets', () => {
    it('standard distributed to both jetbrains and vscode targets appears in both paths', async () => {
      // Create a universal standard that applies to both platforms
      const universalStandard = await standardsHexa
        .getAdapter()
        .createStandard({
          name: 'Universal Testing Standards',
          description: 'Testing standards applicable to any IDE platform',
          rules: [
            { content: 'Write comprehensive unit tests' },
            { content: 'Use descriptive test names' },
            { content: 'Mock external dependencies' },
          ],
          organizationId: organization.id,
          userId: user.id,
          scope: 'universal',
          spaceId: space.id,
        });

      const universalStandardVersions: StandardVersion[] = [
        {
          id: 'universal-standard-version-1' as StandardVersionId,
          standardId: universalStandard.id,
          name: universalStandard.name,
          slug: universalStandard.slug,
          description: universalStandard.description,
          version: universalStandard.version,
          summary: 'Universal testing standards for all platforms',
          userId: user.id,
          scope: universalStandard.scope,
        },
      ];

      // Deploy to both jetbrains and vscode targets
      const multiTargetUpdates =
        await deployerService.aggregateStandardsDeployments(
          universalStandardVersions,
          gitRepo,
          [jetbrainsTarget, vscodeTarget], // Both targets
          ['packmind'],
        );

      // Should have 4 files - 2 for each target (standard file + index file)
      expect(multiTargetUpdates.createOrUpdate).toHaveLength(4);

      // Find jetbrains files
      const jetbrainsStandardFile = multiTargetUpdates.createOrUpdate.find(
        (file) =>
          file.path ===
          'jetbrains/.packmind/standards/universal-testing-standards.md',
      );
      const jetbrainsIndexFile = multiTargetUpdates.createOrUpdate.find(
        (file) => file.path === 'jetbrains/.packmind/standards-index.md',
      );

      // Find vscode files
      const vscodeStandardFile = multiTargetUpdates.createOrUpdate.find(
        (file) =>
          file.path ===
          'vscode/.packmind/standards/universal-testing-standards.md',
      );
      const vscodeIndexFile = multiTargetUpdates.createOrUpdate.find(
        (file) => file.path === 'vscode/.packmind/standards-index.md',
      );

      // Verify all files exist
      expect(jetbrainsStandardFile).toBeDefined();
      expect(jetbrainsIndexFile).toBeDefined();
      expect(vscodeStandardFile).toBeDefined();
      expect(vscodeIndexFile).toBeDefined();

      // Verify jetbrains files contain the universal standard
      expect(jetbrainsStandardFile?.content).toContain(
        'Universal Testing Standards',
      );
      expect(jetbrainsIndexFile?.content).toContain(
        'Universal Testing Standards',
      );

      // Verify vscode files contain the universal standard
      expect(vscodeStandardFile?.content).toContain(
        'Universal Testing Standards',
      );
      expect(vscodeIndexFile?.content).toContain('Universal Testing Standards');
    });

    it('Vincent opening exclusively JetBrains folder sees the universal standard', async () => {
      // Create universal standard version
      const universalStandardVersions: StandardVersion[] = [
        {
          id: 'universal-standard-version-1' as StandardVersionId,
          standardId: standard.id,
          name: 'Universal Testing Standards',
          slug: 'universal-testing-standards',
          description: 'Testing standards applicable to JetBrains and VSCode',
          version: 1,
          summary: 'Universal testing standards',
          userId: user.id,
          scope: 'universal',
        },
      ];

      // Deploy to both targets (as Cedric would do)
      await deployerService.aggregateStandardsDeployments(
        universalStandardVersions,
        gitRepo,
        [jetbrainsTarget, vscodeTarget],
        ['packmind'],
      );

      // Simulate Vincent opening only JetBrains folder
      // He would only see the JetBrains-specific deployment
      const jetbrainsOnlyUpdates =
        await deployerService.aggregateStandardsDeployments(
          universalStandardVersions,
          gitRepo,
          [jetbrainsTarget], // Only JetBrains target
          ['packmind'],
        );

      expect(jetbrainsOnlyUpdates.createOrUpdate).toHaveLength(2);

      // Find the jetbrains index file
      const jetbrainsIndexFile = jetbrainsOnlyUpdates.createOrUpdate.find(
        (file) => file.path === 'jetbrains/.packmind/standards-index.md',
      );
      expect(jetbrainsIndexFile).toBeDefined();
      expect(jetbrainsIndexFile?.content).toContain(
        'Universal Testing Standards',
      );

      // Verify the path is specifically for JetBrains
      expect(jetbrainsIndexFile?.path.startsWith('jetbrains/')).toBe(true);
      expect(jetbrainsIndexFile?.path).not.toContain('vscode');
    });
  });

  describe('Example Mapping Scenario 1: Recipe distributed to jetbrains target', () => {
    it('deploys recipe to jetbrains/.packmind/recipes path', async () => {
      // Create recipe version
      const recipeVersions: RecipeVersion[] = [
        {
          id: 'recipe-version-1' as RecipeVersionId,
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: recipe.content,
          version: recipe.version,
          summary: 'JetBrains services best practices',
          userId: user.id,
        },
      ];

      // Deploy to jetbrains target only
      const recipeUpdates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        [jetbrainsTarget], // Only jetbrains target
        ['packmind'], // Deploy to Packmind agent
      );

      expect(recipeUpdates.createOrUpdate).toHaveLength(2);

      // Verify individual recipe file is created in jetbrains path
      const recipeFile = recipeUpdates.createOrUpdate.find((file) =>
        file.path.includes('recipes/writing-good-jetbrains-services.md'),
      );
      expect(recipeFile).toBeDefined();
      expect(recipeFile?.path).toBe(
        'jetbrains/.packmind/recipes/writing-good-jetbrains-services.md',
      );
      expect(recipeFile?.content).toContain('Writing Good JetBrains Services');

      // Verify recipes index file is created in jetbrains path
      const indexFile = recipeUpdates.createOrUpdate.find(
        (file) => file.path === 'jetbrains/.packmind/recipes-index.md',
      );
      expect(indexFile).toBeDefined();
      expect(indexFile?.content).toContain('Writing Good JetBrains Services');
      expect(indexFile?.content).toContain(
        'writing-good-jetbrains-services.md',
      );
    });

    it('deploys recipe to jetbrains path for Claude agent', async () => {
      const recipeVersions: RecipeVersion[] = [
        {
          id: 'recipe-version-1' as RecipeVersionId,
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: recipe.content,
          version: recipe.version,
          summary: 'JetBrains services best practices',
          userId: user.id,
        },
      ];

      // Deploy to jetbrains target for Claude
      const recipeUpdates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        [jetbrainsTarget],
        ['claude'],
      );

      expect(recipeUpdates.createOrUpdate).toHaveLength(1);

      // Verify Claude file is deployed to jetbrains/CLAUDE.md
      const deployedFile = recipeUpdates.createOrUpdate[0];
      expect(deployedFile.path).toBe('jetbrains/CLAUDE.md');
      // Claude deployer creates a general recipe template, not specific recipe content
      expect(deployedFile.content).toContain('Packmind Recipes');
      expect(deployedFile.content).toContain(recipeVersions[0].name);
    });

    it('deploys recipe to jetbrains path for Cursor agent', async () => {
      const recipeVersions: RecipeVersion[] = [
        {
          id: 'recipe-version-1' as RecipeVersionId,
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: recipe.content,
          version: recipe.version,
          summary: 'JetBrains services best practices',
          userId: user.id,
        },
      ];

      // Deploy to jetbrains target for Cursor
      const recipeUpdates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        [jetbrainsTarget],
        ['cursor'],
      );

      expect(recipeUpdates.createOrUpdate).toHaveLength(1);

      // Verify Cursor file is deployed to jetbrains/.cursor/rules/packmind/recipes-index.mdc
      const deployedFile = recipeUpdates.createOrUpdate[0];
      expect(deployedFile.path).toBe(
        'jetbrains/.cursor/rules/packmind/recipes-index.mdc',
      );
      expect(deployedFile.content).toContain('Writing Good JetBrains Services');
    });
  });

  describe('Example Mapping Scenario 2: Recipe isolation - jetbrains recipe not in vscode work', () => {
    it('recipe distributed to jetbrains target does not appear in vscode deployment', async () => {
      const jetbrainsRecipeVersions: RecipeVersion[] = [
        {
          id: 'jetbrains-recipe-version-1' as RecipeVersionId,
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: recipe.content,
          version: recipe.version,
          summary: 'JetBrains services best practices',
          userId: user.id,
        },
      ];

      // Deploy to jetbrains target
      const jetbrainsUpdates = await deployerService.aggregateRecipeDeployments(
        jetbrainsRecipeVersions,
        gitRepo,
        [jetbrainsTarget],
        ['packmind'],
      );

      // Simulate Joan working on VSCode plugin - deploy to vscode target with empty recipes
      const vscodeUpdates = await deployerService.aggregateRecipeDeployments(
        [], // No recipes for VSCode target
        gitRepo,
        [vscodeTarget],
        ['packmind'],
      );

      // Verify jetbrains deployment exists with both recipe and index files
      expect(jetbrainsUpdates.createOrUpdate).toHaveLength(2);

      const jetbrainsRecipeFile = jetbrainsUpdates.createOrUpdate.find((file) =>
        file.path.includes('recipes/writing-good-jetbrains-services.md'),
      );
      expect(jetbrainsRecipeFile).toBeDefined();
      expect(jetbrainsRecipeFile?.path.startsWith('jetbrains/')).toBe(true);
      expect(jetbrainsRecipeFile?.content).toContain(
        'Writing Good JetBrains Services',
      );

      // Verify vscode deployment creates empty index (no actual recipes, but still creates index file)
      expect(vscodeUpdates.createOrUpdate).toHaveLength(1);
      expect(vscodeUpdates.createOrUpdate[0].path).toBe(
        'vscode/.packmind/recipes-index.md',
      );
      expect(vscodeUpdates.createOrUpdate[0].content).toContain(
        'No recipes available',
      );

      // Verify the paths are completely separate
      const jetbrainsIndexFile = jetbrainsUpdates.createOrUpdate.find(
        (file) => file.path === 'jetbrains/.packmind/recipes-index.md',
      );
      expect(jetbrainsIndexFile).toBeDefined();
      expect(jetbrainsIndexFile?.path.startsWith('jetbrains/')).toBe(true);
      expect(jetbrainsIndexFile?.path).not.toContain('vscode');
    });
  });

  describe('Example Mapping Scenario 3: Recipe distributed to multiple targets', () => {
    it('recipe distributed to both jetbrains and vscode targets appears in both paths', async () => {
      // Create a TDD recipe that applies to both platforms
      const tddRecipe = await recipesHexa.getAdapter().captureRecipe({
        name: 'Test-Driven Development (TDD) Best Practices',
        content: `# Test-Driven Development (TDD) Best Practices

## Overview
This recipe provides TDD best practices applicable to any IDE platform.

## Best Practices
1. Write tests first
2. Red-Green-Refactor cycle
3. Keep tests simple and focused
4. Use descriptive test names

## Examples
- JetBrains: Use JUnit or TestNG
- VSCode: Use Jest, Mocha, or Vitest
`,
        userId: user.id,
        organizationId: organization.id,
        spaceId: space.id.toString(),
      });

      const tddRecipeVersions: RecipeVersion[] = [
        {
          id: 'tdd-recipe-version-1' as RecipeVersionId,
          recipeId: tddRecipe.id,
          name: tddRecipe.name,
          slug: tddRecipe.slug,
          content: tddRecipe.content,
          version: tddRecipe.version,
          summary: 'TDD best practices for all platforms',
          userId: user.id,
        },
      ];

      // Deploy to both jetbrains and vscode targets
      const multiTargetUpdates =
        await deployerService.aggregateRecipeDeployments(
          tddRecipeVersions,
          gitRepo,
          [jetbrainsTarget, vscodeTarget], // Both targets
          ['packmind'],
        );

      // Should have 4 files - 2 for each target (recipe file + index file)
      expect(multiTargetUpdates.createOrUpdate).toHaveLength(4);

      // Find jetbrains files
      const jetbrainsRecipeFile = multiTargetUpdates.createOrUpdate.find(
        (file) =>
          file.path ===
          'jetbrains/.packmind/recipes/test-driven-development-tdd-best-practices.md',
      );
      const jetbrainsIndexFile = multiTargetUpdates.createOrUpdate.find(
        (file) => file.path === 'jetbrains/.packmind/recipes-index.md',
      );

      // Find vscode files
      const vscodeRecipeFile = multiTargetUpdates.createOrUpdate.find(
        (file) =>
          file.path ===
          'vscode/.packmind/recipes/test-driven-development-tdd-best-practices.md',
      );
      const vscodeIndexFile = multiTargetUpdates.createOrUpdate.find(
        (file) => file.path === 'vscode/.packmind/recipes-index.md',
      );

      // Verify all files exist
      expect(jetbrainsRecipeFile).toBeDefined();
      expect(jetbrainsIndexFile).toBeDefined();
      expect(vscodeRecipeFile).toBeDefined();
      expect(vscodeIndexFile).toBeDefined();

      // Verify jetbrains files contain the TDD recipe
      expect(jetbrainsRecipeFile?.content).toContain(
        'Test-Driven Development (TDD) Best Practices',
      );
      expect(jetbrainsIndexFile?.content).toContain(
        'Test-Driven Development (TDD) Best Practices',
      );

      // Verify vscode files contain the TDD recipe
      expect(vscodeRecipeFile?.content).toContain(
        'Test-Driven Development (TDD) Best Practices',
      );
      expect(vscodeIndexFile?.content).toContain(
        'Test-Driven Development (TDD) Best Practices',
      );
    });

    it('Vincent opening exclusively JetBrains folder sees the TDD recipe', async () => {
      // Create TDD recipe version
      const tddRecipeVersions: RecipeVersion[] = [
        {
          id: 'tdd-recipe-version-1' as RecipeVersionId,
          recipeId: recipe.id,
          name: 'Test-Driven Development (TDD) Best Practices',
          slug: 'tdd-best-practices',
          content: `# TDD Best Practices\n\nApplicable to JetBrains and VSCode.`,
          version: 1,
          summary: 'TDD best practices',
          userId: user.id,
        },
      ];

      // Deploy to both targets (as Cedric would do)
      await deployerService.aggregateRecipeDeployments(
        tddRecipeVersions,
        gitRepo,
        [jetbrainsTarget, vscodeTarget],
        ['packmind'],
      );

      // Simulate Vincent opening only JetBrains folder
      // He would only see the JetBrains-specific deployment
      const jetbrainsOnlyUpdates =
        await deployerService.aggregateRecipeDeployments(
          tddRecipeVersions,
          gitRepo,
          [jetbrainsTarget], // Only JetBrains target
          ['packmind'],
        );

      expect(jetbrainsOnlyUpdates.createOrUpdate).toHaveLength(2);

      // Find the jetbrains index file
      const jetbrainsIndexFile = jetbrainsOnlyUpdates.createOrUpdate.find(
        (file) => file.path === 'jetbrains/.packmind/recipes-index.md',
      );
      expect(jetbrainsIndexFile).toBeDefined();
      expect(jetbrainsIndexFile?.content).toContain(
        'Test-Driven Development (TDD) Best Practices',
      );

      // Verify the path is specifically for JetBrains
      expect(jetbrainsIndexFile?.path.startsWith('jetbrains/')).toBe(true);
      expect(jetbrainsIndexFile?.path).not.toContain('vscode');
    });
  });

  describe('Path prefix behavior', () => {
    it('removes leading slash from target path during prefixing', async () => {
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

      // Deploy to jetbrains target (path: '/jetbrains/')
      const updates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        [jetbrainsTarget],
        ['packmind'],
      );

      expect(updates.createOrUpdate).toHaveLength(2);

      // Find the index file to verify path behavior
      const indexFile = updates.createOrUpdate.find(
        (file) => file.path === 'jetbrains/.packmind/recipes-index.md',
      );
      expect(indexFile).toBeDefined();

      // Verify the path doesn't have double slashes
      expect(indexFile?.path).toBe('jetbrains/.packmind/recipes-index.md');
      expect(indexFile?.path).not.toContain('//');
    });

    it('handles root target correctly', async () => {
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

      // Deploy to root target (path: '/')
      const updates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        [rootTarget],
        ['packmind'],
      );

      expect(updates.createOrUpdate).toHaveLength(2);

      // Find the index file to verify root path behavior
      const indexFile = updates.createOrUpdate.find(
        (file) => file.path === '.packmind/recipes-index.md',
      );
      expect(indexFile).toBeDefined();

      // Verify root deployment has no prefix
      expect(indexFile?.path).toBe('.packmind/recipes-index.md');
    });
  });
});
