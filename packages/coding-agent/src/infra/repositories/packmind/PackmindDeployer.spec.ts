import { PackmindDeployer } from './PackmindDeployer';
import {
  RecipeVersion,
  RecipeVersionId,
  Recipe,
  RecipeId,
} from '@packmind/recipes';
import {
  StandardVersion,
  StandardVersionId,
  Standard,
  StandardId,
} from '@packmind/standards';
import { GitRepo, GitRepoId, GitProviderId } from '@packmind/git';
import { OrganizationId, UserId } from '@packmind/accounts';

// Create mock entities without using the factories to avoid import issues
const createTestRecipeId = (id: string): RecipeId => id as RecipeId;
const createTestRecipeVersionId = (id: string): RecipeVersionId =>
  id as RecipeVersionId;
const createTestStandardId = (id: string): StandardId => id as StandardId;
const createTestStandardVersionId = (id: string): StandardVersionId =>
  id as StandardVersionId;
const createTestOrganizationId = (id: string): OrganizationId =>
  id as OrganizationId;
const createTestUserId = (id: string): UserId => id as UserId;
const createTestGitRepoId = (id: string): GitRepoId => id as GitRepoId;
const createTestGitProviderId = (id: string): GitProviderId =>
  id as GitProviderId;

describe('PackmindDeployer', () => {
  let deployer: PackmindDeployer;
  let mockGitRepo: GitRepo;

  beforeEach(() => {
    // Create deployer without StandardsHexa for basic tests
    deployer = new PackmindDeployer();
    mockGitRepo = {
      id: createTestGitRepoId('test-repo-id'),
      owner: 'test-owner',
      repo: 'test-repo',
      providerId: createTestGitProviderId('provider-id'),
      branch: 'main',
    };
  });

  describe('deployRecipes', () => {
    it('deploys a single recipe with correct file structure', async () => {
      const recipe: Recipe = {
        id: createTestRecipeId('recipe-1'),
        name: 'Test Recipe',
        slug: 'test-recipe',
        content: 'Original recipe content',
        version: 1,
        organizationId: createTestOrganizationId('org-1'),
        userId: createTestUserId('user-1'),
      };

      const recipeVersion: RecipeVersion = {
        id: createTestRecipeVersionId('recipe-version-1'),
        recipeId: recipe.id,
        name: recipe.name,
        slug: recipe.slug,
        content: 'This is the recipe content',
        version: 1,
        summary: 'A test recipe summary',
        userId: createTestUserId('user-1'),
      };

      const result = await deployer.deployRecipes([recipeVersion], mockGitRepo);

      expect(result.createOrUpdate).toHaveLength(2);
      expect(result.delete).toHaveLength(0);

      // Check recipe file
      const recipeFile = result.createOrUpdate.find(
        (f) => f.path === '.packmind/recipes/test-recipe.md',
      );

      expect(recipeFile?.content).toContain('This is the recipe content');

      // Check recipes index
      const recipesIndexFile = result.createOrUpdate.find(
        (f) => f.path === '.packmind/recipes-index.md',
      );
      expect(recipesIndexFile).toBeDefined();
      expect(recipesIndexFile?.content).toContain('# Packmind Recipes Index');
      expect(recipesIndexFile?.content).toContain('## Available Recipes');
      expect(recipesIndexFile?.content).toContain(
        '- [Test Recipe](recipes/test-recipe.md) : A test recipe summary',
      );
    });

    it('deploys multiple recipes sorted alphabetically', async () => {
      const zebraRecipe: Recipe = {
        id: createTestRecipeId('recipe-z'),
        name: 'Zebra Recipe',
        slug: 'zebra-recipe',
        content: 'Original zebra content',
        version: 1,
        organizationId: createTestOrganizationId('org-1'),
        userId: createTestUserId('user-1'),
      };

      const appleRecipe: Recipe = {
        id: createTestRecipeId('recipe-a'),
        name: 'Apple Recipe',
        slug: 'apple-recipe',
        content: 'Original apple content',
        version: 2,
        organizationId: createTestOrganizationId('org-1'),
        userId: createTestUserId('user-1'),
      };

      const recipeVersions: RecipeVersion[] = [
        {
          id: createTestRecipeVersionId('recipe-version-z'),
          recipeId: zebraRecipe.id,
          name: zebraRecipe.name,
          slug: zebraRecipe.slug,
          content: 'Zebra content',
          version: 1,
          summary: 'Last alphabetically',
          userId: createTestUserId('user-1'),
        },
        {
          id: createTestRecipeVersionId('recipe-version-a'),
          recipeId: appleRecipe.id,
          name: appleRecipe.name,
          slug: appleRecipe.slug,
          content: 'Apple content',
          version: 2,
          summary: 'First alphabetically',
          userId: createTestUserId('user-1'),
        },
      ];

      const result = await deployer.deployRecipes(recipeVersions, mockGitRepo);

      expect(result.createOrUpdate).toHaveLength(3); // 2 recipes + 1 recipes index

      // Check recipes index has recipes in alphabetical order
      const recipesIndexFile = result.createOrUpdate.find(
        (f) => f.path === '.packmind/recipes-index.md',
      );
      const recipesIndexContent = recipesIndexFile?.content || '';
      const appleIndex = recipesIndexContent.indexOf('Apple Recipe');
      const zebraIndex = recipesIndexContent.indexOf('Zebra Recipe');
      expect(appleIndex).toBeLessThan(zebraIndex);
    });

    it('handles empty recipe list', async () => {
      const result = await deployer.deployRecipes([], mockGitRepo);

      expect(result.createOrUpdate).toHaveLength(1); // Only recipes index
      expect(result.delete).toHaveLength(0);

      const recipesIndexFile = result.createOrUpdate[0];
      expect(recipesIndexFile.content).toContain('No recipes available.');
    });
  });

  describe('deployStandards', () => {
    it('deploys a single standard with correct file structure', async () => {
      const standard: Standard = {
        id: createTestStandardId('standard-1'),
        name: 'Test Standard',
        slug: 'test-standard',
        description: 'Original standard description',
        version: 1,
        organizationId: createTestOrganizationId('org-1'),
        userId: createTestUserId('user-1'),
        scope: 'backend',
      };

      const standardVersion: StandardVersion = {
        id: createTestStandardVersionId('standard-version-1'),
        standardId: standard.id,
        name: standard.name,
        slug: standard.slug,
        description: 'This is the standard description',
        version: 1,
        summary: 'A test standard summary',
        userId: createTestUserId('user-1'),
        scope: 'backend',
      };

      const result = await deployer.deployStandards(
        [standardVersion],
        mockGitRepo,
      );

      expect(result.createOrUpdate).toHaveLength(2);
      expect(result.delete).toHaveLength(0);

      // Check standard file
      const standardFile = result.createOrUpdate.find(
        (f) => f.path === '.packmind/standards/test-standard.md',
      );
      expect(standardFile).toBeDefined();
      expect(standardFile?.content).toContain('# Test Standard');
      expect(standardFile?.content).toContain(
        'This is the standard description',
      );
      expect(standardFile?.content).toContain('## Rules');
      expect(standardFile?.content).toContain(
        '*This standard was automatically generated from version 1.*',
      );

      // Check standards index
      const standardsIndexFile = result.createOrUpdate.find(
        (f) => f.path === '.packmind/standards-index.md',
      );
      expect(standardsIndexFile).toBeDefined();
      expect(standardsIndexFile?.content).toContain(
        '# Packmind Standards Index',
      );
      expect(standardsIndexFile?.content).toContain('## Available Standards');
      expect(standardsIndexFile?.content).toContain(
        '- [Test Standard](./standards/test-standard.md) : A test standard summary',
      );
    });

    it('includes rules in standard content', async () => {
      const standard: Standard = {
        id: createTestStandardId('standard-with-rules'),
        name: 'Standard With Rules',
        slug: 'standard-with-rules',
        description: 'Original standard with rules',
        version: 1,
        organizationId: createTestOrganizationId('org-1'),
        userId: createTestUserId('user-1'),
        scope: 'backend',
      };

      const standardVersion: StandardVersion = {
        id: createTestStandardVersionId('standard-version-with-rules'),
        standardId: standard.id,
        name: standard.name,
        slug: standard.slug,
        description: 'This standard has rules',
        version: 1,
        summary: 'Standard with rules summary',
        userId: createTestUserId('user-1'),
        scope: 'backend',
        rules: [
          {
            id: 'rule-1' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
            content: 'Always use const for immutable values',
            standardVersionId: 'standard-version-with-rules' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          },
          {
            id: 'rule-2' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
            content: 'Prefer async/await over promises',
            standardVersionId: 'standard-version-with-rules' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          },
        ],
      };

      const result = await deployer.deployStandards(
        [standardVersion],
        mockGitRepo,
      );

      const standardFile = result.createOrUpdate.find(
        (f) => f.path === '.packmind/standards/standard-with-rules.md',
      );

      expect(standardFile).toBeDefined();
      expect(standardFile?.content).toContain('# Standard With Rules');
      expect(standardFile?.content).toContain('This standard has rules');
      expect(standardFile?.content).toContain('## Rules');
      expect(standardFile?.content).toContain(
        '* Always use const for immutable values',
      );
      expect(standardFile?.content).toContain(
        '* Prefer async/await over promises',
      );
      expect(standardFile?.content).toContain(
        '*This standard was automatically generated from version 1.*',
      );
    });

    it('handles standard without scope', async () => {
      const standard: Standard = {
        id: createTestStandardId('standard-no-scope'),
        name: 'No Scope Standard',
        slug: 'no-scope-standard',
        description: 'Original description without scope',
        version: 1,
        organizationId: createTestOrganizationId('org-1'),
        userId: createTestUserId('user-1'),
        scope: null,
      };

      const standardVersion: StandardVersion = {
        id: createTestStandardVersionId('standard-version-no-scope'),
        standardId: standard.id,
        name: standard.name,
        slug: standard.slug,
        description: 'Description without scope',
        version: 1,
        summary: null,
        userId: createTestUserId('user-1'),
        scope: null,
      };

      const result = await deployer.deployStandards(
        [standardVersion],
        mockGitRepo,
      );

      const standardFile = result.createOrUpdate.find(
        (f) => f.path === '.packmind/standards/no-scope-standard.md',
      );
      expect(standardFile?.content).toContain('Description without scope');
      expect(standardFile?.content).toContain('## Rules');
      expect(standardFile?.content).toContain(
        '*This standard was automatically generated from version 1.*',
      );
    });

    it('deploys multiple standards sorted alphabetically', async () => {
      const zebraStandard: Standard = {
        id: createTestStandardId('standard-z'),
        name: 'Zebra Standard',
        slug: 'zebra-standard',
        description: 'Original zebra description',
        version: 1,
        organizationId: createTestOrganizationId('org-1'),
        userId: createTestUserId('user-1'),
        scope: null,
      };

      const appleStandard: Standard = {
        id: createTestStandardId('standard-a'),
        name: 'Apple Standard',
        slug: 'apple-standard',
        description: 'Original apple description',
        version: 2,
        organizationId: createTestOrganizationId('org-1'),
        userId: createTestUserId('user-1'),
        scope: 'frontend',
      };

      const standardVersions: StandardVersion[] = [
        {
          id: createTestStandardVersionId('standard-version-z'),
          standardId: zebraStandard.id,
          name: zebraStandard.name,
          slug: zebraStandard.slug,
          description: 'Zebra description',
          version: 1,
          summary: 'Last alphabetically',
          userId: createTestUserId('user-1'),
          scope: null,
        },
        {
          id: createTestStandardVersionId('standard-version-a'),
          standardId: appleStandard.id,
          name: appleStandard.name,
          slug: appleStandard.slug,
          description: 'Apple description',
          version: 2,
          summary: 'First alphabetically',
          userId: createTestUserId('user-1'),
          scope: 'frontend',
        },
      ];

      const result = await deployer.deployStandards(
        standardVersions,
        mockGitRepo,
      );

      expect(result.createOrUpdate).toHaveLength(3); // 2 standards + 1 index

      // Check standards index has standards in alphabetical order
      const standardsIndexFile = result.createOrUpdate.find(
        (f) => f.path === '.packmind/standards-index.md',
      );
      const indexContent = standardsIndexFile?.content || '';
      const appleIndex = indexContent.indexOf('Apple Standard');
      const zebraIndex = indexContent.indexOf('Zebra Standard');
      expect(appleIndex).toBeLessThan(zebraIndex);
    });

    it('handles empty standards list', async () => {
      const result = await deployer.deployStandards([], mockGitRepo);

      expect(result.createOrUpdate).toHaveLength(1); // Only standards index
      expect(result.delete).toHaveLength(0);

      const indexFile = result.createOrUpdate[0];
      expect(indexFile.content).toContain('No standards available.');
    });

    it('fetches rules from StandardsHexa if not provided', async () => {
      // Mock StandardsHexa
      const mockStandardsHexa = {
        getRulesByStandardId: jest.fn().mockResolvedValue([
          {
            id: 'rule-1',
            content: 'Fetched rule 1',
            standardVersionId: 'standard-version-1',
          },
          {
            id: 'rule-2',
            content: 'Fetched rule 2',
            standardVersionId: 'standard-version-1',
          },
        ]),
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      const deployerWithHexa = new PackmindDeployer(mockStandardsHexa);

      const standard: Standard = {
        id: createTestStandardId('standard-1'),
        name: 'Standard Without Rules',
        slug: 'standard-without-rules',
        description: 'Original standard description',
        version: 1,
        organizationId: createTestOrganizationId('org-1'),
        userId: createTestUserId('user-1'),
        scope: 'backend',
      };

      const standardVersion: StandardVersion = {
        id: createTestStandardVersionId('standard-version-1'),
        standardId: standard.id,
        name: standard.name,
        slug: standard.slug,
        description: 'Standard without rules initially',
        version: 1,
        summary: 'Test summary',
        userId: createTestUserId('user-1'),
        scope: 'backend',
        // No rules property - should be fetched from StandardsHexa
      };

      const result = await deployerWithHexa.deployStandards(
        [standardVersion],
        mockGitRepo,
      );

      // Verify StandardsHexa was called with the standardId
      expect(mockStandardsHexa.getRulesByStandardId).toHaveBeenCalledWith(
        standard.id,
      );

      // Check that the rules were included in the output
      const standardFile = result.createOrUpdate.find(
        (f) => f.path === '.packmind/standards/standard-without-rules.md',
      );
      expect(standardFile).toBeDefined();
      expect(standardFile?.content).toContain('* Fetched rule 1');
      expect(standardFile?.content).toContain('* Fetched rule 2');
    });
  });
});
