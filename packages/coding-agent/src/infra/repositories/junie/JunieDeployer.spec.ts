import { JunieDeployer } from './JunieDeployer';
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

describe('JunieDeployer', () => {
  let deployer: JunieDeployer;
  let mockGitRepo: GitRepo;

  beforeEach(() => {
    // Create deployer without StandardsHexa or GitHexa for basic tests
    deployer = new JunieDeployer();
    mockGitRepo = {
      id: createTestGitRepoId('test-repo-id'),
      owner: 'test-owner',
      repo: 'test-repo',
      providerId: createTestGitProviderId('provider-id'),
      branch: 'main',
    };
  });

  describe('deployRecipes', () => {
    it('creates Junie guidelines file with recipe instructions', async () => {
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

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.delete).toHaveLength(0);

      const guidelinesFile = result.createOrUpdate[0];
      expect(guidelinesFile.path).toBe('.junie/guidelines.md');
      expect(guidelinesFile.content).toContain('# Packmind Recipes');
      expect(guidelinesFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
      expect(guidelinesFile.content).toContain('ALWAYS READ');
      expect(guidelinesFile.content).toContain('.packmind/recipes-index.md');
      expect(guidelinesFile.content).toContain('aiAgent: "Junie"');
      expect(guidelinesFile.content).toContain(
        'gitRepo: "test-owner/test-repo"',
      );
    });

    it('handles empty recipe list', async () => {
      const result = await deployer.deployRecipes([], mockGitRepo);

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.delete).toHaveLength(0);

      const guidelinesFile = result.createOrUpdate[0];
      expect(guidelinesFile.content).toContain('# Packmind Recipes');
      expect(guidelinesFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
      expect(guidelinesFile.content).toContain('ALWAYS READ');
    });

    it('includes multiple recipes in instructions', async () => {
      const recipe1: Recipe = {
        id: createTestRecipeId('recipe-1'),
        name: 'Recipe One',
        slug: 'recipe-one',
        content: 'Recipe one content',
        version: 1,
        organizationId: createTestOrganizationId('org-1'),
        userId: createTestUserId('user-1'),
      };

      const recipe2: Recipe = {
        id: createTestRecipeId('recipe-2'),
        name: 'Recipe Two',
        slug: 'recipe-two',
        content: 'Recipe two content',
        version: 1,
        organizationId: createTestOrganizationId('org-1'),
        userId: createTestUserId('user-1'),
      };

      const recipeVersions: RecipeVersion[] = [
        {
          id: createTestRecipeVersionId('recipe-version-1'),
          recipeId: recipe1.id,
          name: recipe1.name,
          slug: recipe1.slug,
          content: 'Recipe one content',
          version: 1,
          summary: 'Recipe one summary',
          userId: createTestUserId('user-1'),
        },
        {
          id: createTestRecipeVersionId('recipe-version-2'),
          recipeId: recipe2.id,
          name: recipe2.name,
          slug: recipe2.slug,
          content: 'Recipe two content',
          version: 1,
          summary: 'Recipe two summary',
          userId: createTestUserId('user-1'),
        },
      ];

      const result = await deployer.deployRecipes(recipeVersions, mockGitRepo);

      const guidelinesFile = result.createOrUpdate[0];
      expect(guidelinesFile.content).toContain('# Packmind Recipes');
      expect(guidelinesFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
      expect(guidelinesFile.content).toContain('ALWAYS READ');
    });
  });

  describe('deployStandards', () => {
    it('creates Junie guidelines file with standards instructions', async () => {
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

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.delete).toHaveLength(0);

      const guidelinesFile = result.createOrUpdate[0];
      expect(guidelinesFile.path).toBe('.junie/guidelines.md');
      expect(guidelinesFile.content).toContain('## Packmind Standards');
      expect(guidelinesFile.content).toContain(
        'Follow the coding standards defined in',
      );
      expect(guidelinesFile.content).toContain('.packmind/standards-index.md');
    });

    it('handles empty standards list', async () => {
      const result = await deployer.deployStandards([], mockGitRepo);

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.delete).toHaveLength(0);

      const guidelinesFile = result.createOrUpdate[0];
      expect(guidelinesFile.content).toContain('## Packmind Standards');
      expect(guidelinesFile.content).toContain('Follow the coding standards');
    });

    it('works with StandardsHexa dependency', async () => {
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

      const deployerWithHexa = new JunieDeployer(mockStandardsHexa);

      const standard: Standard = {
        id: createTestStandardId('standard-1'),
        name: 'Standard Test',
        slug: 'standard-test',
        description: 'Standard description',
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
        description: 'Standard description',
        version: 1,
        summary: 'Test summary',
        userId: createTestUserId('user-1'),
        scope: 'backend',
      };

      const result = await deployerWithHexa.deployStandards(
        [standardVersion],
        mockGitRepo,
      );

      // Check that the guidelines file was created
      const guidelinesFile = result.createOrUpdate[0];
      expect(guidelinesFile).toBeDefined();
      expect(guidelinesFile.path).toBe('.junie/guidelines.md');
      expect(guidelinesFile.content).toContain('## Packmind Standards');
      expect(guidelinesFile.content).toContain('Follow the coding standards');
    });

    it('includes multiple standards in instructions', async () => {
      const standard1: Standard = {
        id: createTestStandardId('standard-1'),
        name: 'Standard One',
        slug: 'standard-one',
        description: 'Standard one description',
        version: 1,
        organizationId: createTestOrganizationId('org-1'),
        userId: createTestUserId('user-1'),
        scope: 'backend',
      };

      const standard2: Standard = {
        id: createTestStandardId('standard-2'),
        name: 'Standard Two',
        slug: 'standard-two',
        description: 'Standard two description',
        version: 1,
        organizationId: createTestOrganizationId('org-1'),
        userId: createTestUserId('user-1'),
        scope: 'frontend',
      };

      const standardVersions: StandardVersion[] = [
        {
          id: createTestStandardVersionId('standard-version-1'),
          standardId: standard1.id,
          name: standard1.name,
          slug: standard1.slug,
          description: 'Standard one description',
          version: 1,
          summary: 'Standard one summary',
          userId: createTestUserId('user-1'),
          scope: 'backend',
        },
        {
          id: createTestStandardVersionId('standard-version-2'),
          standardId: standard2.id,
          name: standard2.name,
          slug: standard2.slug,
          description: 'Standard two description',
          version: 1,
          summary: 'Standard two summary',
          userId: createTestUserId('user-1'),
          scope: 'frontend',
        },
      ];

      const result = await deployer.deployStandards(
        standardVersions,
        mockGitRepo,
      );

      const guidelinesFile = result.createOrUpdate[0];
      expect(guidelinesFile.content).toContain('## Packmind Standards');
      expect(guidelinesFile.content).toContain('Follow the coding standards');
    });
  });
});
