import { JunieDeployer } from './JunieDeployer';
import {
  GitRepo,
  createGitRepoId,
  createGitProviderId,
  StandardVersion,
  Standard,
  createStandardId,
  createStandardVersionId,
  Recipe,
  RecipeVersion,
  createRecipeVersionId,
  createRecipeId,
  createOrganizationId,
  createUserId,
  Target,
  createTargetId,
} from '@packmind/shared';
import { v4 as uuidv4 } from 'uuid';
import { GenericStandardSectionWriter } from '../genericSectionWriter/GenericStandardSectionWriter';

describe('JunieDeployer', () => {
  let deployer: JunieDeployer;
  let mockGitRepo: GitRepo;
  let mockTarget: Target;

  beforeEach(() => {
    // Create deployer without StandardsHexa or GitHexa for basic tests
    deployer = new JunieDeployer();

    mockTarget = {
      id: createTargetId('test-target-id'),
      name: 'Test Target',
      path: '/',
      gitRepoId: createGitRepoId(uuidv4()),
    };

    mockGitRepo = {
      id: createGitRepoId('test-repo-id'),
      owner: 'test-owner',
      repo: 'test-repo',
      providerId: createGitProviderId('provider-id'),
      branch: 'main',
    };
  });

  describe('deployRecipes', () => {
    it('creates Junie guidelines file with recipe instructions', async () => {
      const recipe: Recipe = {
        id: createRecipeId('recipe-1'),
        name: 'Test Recipe',
        slug: 'test-recipe',
        content: 'Original recipe content',
        version: 1,
        organizationId: createOrganizationId('org-1'),
        userId: createUserId('user-1'),
      };

      const recipeVersion: RecipeVersion = {
        id: createRecipeVersionId('recipe-version-1'),
        recipeId: recipe.id,
        name: recipe.name,
        slug: recipe.slug,
        content: 'This is the recipe content',
        version: 1,
        summary: 'A test recipe summary',
        userId: createUserId('user-1'),
      };

      const result = await deployer.deployRecipes(
        [recipeVersion],
        mockGitRepo,
        mockTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.delete).toHaveLength(0);

      const guidelinesFile = result.createOrUpdate[0];
      expect(guidelinesFile.path).toBe('.junie/guidelines.md');
      expect(guidelinesFile.content).toContain('# Packmind Recipes');
      expect(guidelinesFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
      expect(guidelinesFile.content).toContain('ALWAYS READ');
      expect(guidelinesFile.content).toContain(recipe.name);
      expect(guidelinesFile.content).toContain('aiAgent: "Junie"');
      expect(guidelinesFile.content).toContain(
        'gitRepo: "test-owner/test-repo"',
      );
    });

    it('handles empty recipe list', async () => {
      const result = await deployer.deployRecipes([], mockGitRepo, mockTarget);

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.delete).toHaveLength(0);

      const guidelinesFile = result.createOrUpdate[0];
      expect(guidelinesFile.content).toContain('# Packmind Recipes');
      expect(guidelinesFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
      expect(guidelinesFile.content).toContain('ALWAYS READ');
    });

    it('includes multiple recipes in instructions', async () => {
      const recipe1: Recipe = {
        id: createRecipeId('recipe-1'),
        name: 'Recipe One',
        slug: 'recipe-one',
        content: 'Recipe one content',
        version: 1,
        organizationId: createOrganizationId('org-1'),
        userId: createUserId('user-1'),
      };

      const recipe2: Recipe = {
        id: createRecipeId('recipe-2'),
        name: 'Recipe Two',
        slug: 'recipe-two',
        content: 'Recipe two content',
        version: 1,
        organizationId: createOrganizationId('org-1'),
        userId: createUserId('user-1'),
      };

      const recipeVersions: RecipeVersion[] = [
        {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe1.id,
          name: recipe1.name,
          slug: recipe1.slug,
          content: 'Recipe one content',
          version: 1,
          summary: 'Recipe one summary',
          userId: createUserId('user-1'),
        },
        {
          id: createRecipeVersionId('recipe-version-2'),
          recipeId: recipe2.id,
          name: recipe2.name,
          slug: recipe2.slug,
          content: 'Recipe two content',
          version: 1,
          summary: 'Recipe two summary',
          userId: createUserId('user-1'),
        },
      ];

      const result = await deployer.deployRecipes(
        recipeVersions,
        mockGitRepo,
        mockTarget,
      );

      const guidelinesFile = result.createOrUpdate[0];
      expect(guidelinesFile.content).toContain('# Packmind Recipes');
      expect(guidelinesFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
      expect(guidelinesFile.content).toContain('ALWAYS READ');
    });
  });

  describe('deployStandards', () => {
    it('creates Junie guidelines file with standards instructions', async () => {
      const standard: Standard = {
        id: createStandardId('standard-1'),
        name: 'Test Standard',
        slug: 'test-standard',
        description: 'Original standard description',
        version: 1,
        organizationId: createOrganizationId('org-1'),
        userId: createUserId('user-1'),
        scope: 'backend',
      };

      const standardVersion: StandardVersion = {
        id: createStandardVersionId('standard-version-1'),
        standardId: standard.id,
        name: standard.name,
        slug: standard.slug,
        description: 'This is the standard description',
        version: 1,
        summary: 'A test standard summary',
        userId: createUserId('user-1'),
        scope: 'backend',
      };

      const result = await deployer.deployStandards(
        [standardVersion],
        mockGitRepo,
        mockTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.delete).toHaveLength(0);

      const guidelinesFile = result.createOrUpdate[0];
      expect(guidelinesFile.path).toBe('.junie/guidelines.md');
      expect(guidelinesFile.content).toContain('# Packmind Standards');
      expect(guidelinesFile.content).toContain(
        GenericStandardSectionWriter.standardsIntroduction,
      );
      expect(guidelinesFile.content).toContain(standardVersion.name);
    });

    it('handles empty standards list', async () => {
      const result = await deployer.deployStandards(
        [],
        mockGitRepo,
        mockTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.delete).toHaveLength(0);

      const guidelinesFile = result.createOrUpdate[0];
      expect(guidelinesFile.content).not.toContain('# Packmind Standards');
      expect(guidelinesFile.content).not.toContain(
        GenericStandardSectionWriter.standardsIntroduction,
      );
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
        id: createStandardId('standard-1'),
        name: 'Standard Test',
        slug: 'standard-test',
        description: 'Standard description',
        version: 1,
        organizationId: createOrganizationId('org-1'),
        userId: createUserId('user-1'),
        scope: 'backend',
      };

      const standardVersion: StandardVersion = {
        id: createStandardVersionId('standard-version-1'),
        standardId: standard.id,
        name: standard.name,
        slug: standard.slug,
        description: 'Standard description',
        version: 1,
        summary: 'Test summary',
        userId: createUserId('user-1'),
        scope: 'backend',
      };

      const result = await deployerWithHexa.deployStandards(
        [standardVersion],
        mockGitRepo,
        mockTarget,
      );

      // Check that the guidelines file was created
      const guidelinesFile = result.createOrUpdate[0];
      expect(guidelinesFile).toBeDefined();
      expect(guidelinesFile.path).toBe('.junie/guidelines.md');
      expect(guidelinesFile.content).toContain('# Packmind Standards');
      expect(guidelinesFile.content).toContain(
        GenericStandardSectionWriter.standardsIntroduction,
      );
    });

    it('includes multiple standards in instructions', async () => {
      const standard1: Standard = {
        id: createStandardId('standard-1'),
        name: 'Standard One',
        slug: 'standard-one',
        description: 'Standard one description',
        version: 1,
        organizationId: createOrganizationId('org-1'),
        userId: createUserId('user-1'),
        scope: 'backend',
      };

      const standard2: Standard = {
        id: createStandardId('standard-2'),
        name: 'Standard Two',
        slug: 'standard-two',
        description: 'Standard two description',
        version: 1,
        organizationId: createOrganizationId('org-1'),
        userId: createUserId('user-1'),
        scope: 'frontend',
      };

      const standardVersions: StandardVersion[] = [
        {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard1.id,
          name: standard1.name,
          slug: standard1.slug,
          description: 'Standard one description',
          version: 1,
          summary: 'Standard one summary',
          userId: createUserId('user-1'),
          scope: 'backend',
        },
        {
          id: createStandardVersionId('standard-version-2'),
          standardId: standard2.id,
          name: standard2.name,
          slug: standard2.slug,
          description: 'Standard two description',
          version: 1,
          summary: 'Standard two summary',
          userId: createUserId('user-1'),
          scope: 'frontend',
        },
      ];

      const result = await deployer.deployStandards(
        standardVersions,
        mockGitRepo,
        mockTarget,
      );

      const guidelinesFile = result.createOrUpdate[0];
      expect(guidelinesFile.content).toContain('# Packmind Standards');
      expect(guidelinesFile.content).toContain(
        GenericStandardSectionWriter.standardsIntroduction,
      );
    });
  });
});
