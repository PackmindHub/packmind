import { AgentsMDDeployer } from './AgentsMDDeployer';
import { createUserId } from '@packmind/types';
import {
  GitRepo,
  createGitRepoId,
  createGitProviderId,
  StandardVersion,
  createStandardVersionId,
  RecipeVersion,
  createRecipeVersionId,
  Target,
  createTargetId,
} from '@packmind/shared';
import { v4 as uuidv4 } from 'uuid';
import { GenericStandardSectionWriter } from '../genericSectionWriter/GenericStandardSectionWriter';
import { recipeFactory } from '@packmind/recipes/test';
import { standardFactory } from '@packmind/standards/test';

describe('AgentsMDDeployer', () => {
  let deployer: AgentsMDDeployer;
  let mockGitRepo: GitRepo;
  let mockTarget: Target;

  beforeEach(() => {
    // Create deployer without StandardsHexa or GitHexa for basic tests
    deployer = new AgentsMDDeployer();

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deployRecipes', () => {
    it('creates AGENTS.md file with recipe instructions', async () => {
      const recipe = recipeFactory({
        name: 'Test Recipe',
        slug: 'test-recipe',
      });

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

      const agentsMDFile = result.createOrUpdate[0];
      expect(agentsMDFile.path).toBe('AGENTS.md');
      expect(agentsMDFile.content).toContain('# Packmind Recipes');
      expect(agentsMDFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
      expect(agentsMDFile.content).toContain('ALWAYS READ');
      expect(agentsMDFile.content).toContain(recipe.name);
      expect(agentsMDFile.content).toContain('aiAgent: "AGENTS.md"');
      expect(agentsMDFile.content).toContain('gitRepo: "test-owner/test-repo"');
    });

    it('handles empty recipe list', async () => {
      const result = await deployer.deployRecipes([], mockGitRepo, mockTarget);

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.delete).toHaveLength(0);

      const agentsMDFile = result.createOrUpdate[0];
      expect(agentsMDFile.content).toContain('# Packmind Recipes');
      expect(agentsMDFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
      expect(agentsMDFile.content).toContain('ALWAYS READ');
    });

    it('includes multiple recipes in instructions', async () => {
      const recipe1 = recipeFactory({
        name: 'Test Recipe 1',
        slug: 'test-recipe-1',
      });

      const recipe2 = recipeFactory({
        name: 'Test Recipe 2',
        slug: 'test-recipe-2',
      });

      const recipeVersion1: RecipeVersion = {
        id: createRecipeVersionId('recipe-version-1'),
        recipeId: recipe1.id,
        name: recipe1.name,
        slug: recipe1.slug,
        content: 'Recipe 1 instructions',
        version: 1,
        summary: 'Recipe 1 summary',
        userId: createUserId('user-1'),
      };

      const recipeVersion2: RecipeVersion = {
        id: createRecipeVersionId('recipe-version-2'),
        recipeId: recipe2.id,
        name: recipe2.name,
        slug: recipe2.slug,
        content: 'Recipe 2 instructions',
        version: 1,
        summary: 'Recipe 2 summary',
        userId: createUserId('user-1'),
      };

      const result = await deployer.deployRecipes(
        [recipeVersion1, recipeVersion2],
        mockGitRepo,
        mockTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.delete).toHaveLength(0);

      const agentsMDFile = result.createOrUpdate[0];
      expect(agentsMDFile.path).toBe('AGENTS.md');
      expect(agentsMDFile.content).toContain('# Packmind Recipes');
      expect(agentsMDFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
      expect(agentsMDFile.content).toContain(recipeVersion1.name);
      expect(agentsMDFile.content).toContain(recipeVersion2.name);
      expect(agentsMDFile.content).toContain('aiAgent: "AGENTS.md"');
    });
  });

  describe('deployStandards', () => {
    it('creates AGENTS.md file with standards instructions', async () => {
      const standard = standardFactory({
        name: 'Test Standard',
        slug: 'test-standard',
        scope: 'frontend',
      });

      const standardVersion: StandardVersion = {
        id: createStandardVersionId('standard-version-1'),
        standardId: standard.id,
        name: standard.name,
        slug: standard.slug,
        description: 'Test standard description',
        scope: 'frontend',
        version: 1,
        summary: 'A test standard summary',
        userId: createUserId('user-1'),
        rules: [],
      };

      const result = await deployer.deployStandards(
        [standardVersion],
        mockGitRepo,
        mockTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.delete).toHaveLength(0);

      const agentsMDFile = result.createOrUpdate[0];
      expect(agentsMDFile.path).toBe('AGENTS.md');
      expect(agentsMDFile.content).toContain('# Packmind Standards');
      expect(agentsMDFile.content).toContain(
        GenericStandardSectionWriter.standardsIntroduction,
      );
      expect(agentsMDFile.content).toContain(standardVersion.name);
    });

    it('handles empty standards list', async () => {
      const result = await deployer.deployStandards(
        [],
        mockGitRepo,
        mockTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.delete).toHaveLength(0);

      const agentsMDFile = result.createOrUpdate[0];
      expect(agentsMDFile.content).not.toContain('# Packmind Standards');
      expect(agentsMDFile.content).not.toContain(
        GenericStandardSectionWriter.standardsIntroduction,
      );
    });

    it('includes multiple standards in instructions', async () => {
      const standard1 = standardFactory({
        name: 'Frontend Standard',
        slug: 'frontend-standard',
        scope: 'frontend',
      });

      const standard2 = standardFactory({
        name: 'Backend Standard',
        slug: 'backend-standard',
        scope: 'backend',
      });

      const standardVersion1: StandardVersion = {
        id: createStandardVersionId('standard-version-1'),
        standardId: standard1.id,
        name: standard1.name,
        slug: standard1.slug,
        description: 'Frontend standard description',
        scope: 'frontend',
        version: 1,
        summary: 'Frontend standard summary',
        userId: createUserId('user-1'),
        rules: [],
      };

      const standardVersion2: StandardVersion = {
        id: createStandardVersionId('standard-version-2'),
        standardId: standard2.id,
        name: standard2.name,
        slug: standard2.slug,
        description: 'Backend standard description',
        scope: 'backend',
        version: 1,
        summary: 'Backend standard summary',
        userId: createUserId('user-1'),
        rules: [],
      };

      const result = await deployer.deployStandards(
        [standardVersion1, standardVersion2],
        mockGitRepo,
        mockTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.delete).toHaveLength(0);

      const agentsMDFile = result.createOrUpdate[0];
      expect(agentsMDFile.path).toBe('AGENTS.md');
      expect(agentsMDFile.content).toContain('# Packmind Standards');
      expect(agentsMDFile.content).toContain(
        GenericStandardSectionWriter.standardsIntroduction,
      );
    });
  });

  describe('content preservation', () => {
    describe('when adding recipe instructions', () => {
      it('preserves existing content', async () => {
        const existingContent = 'Existing content in AGENTS.md file';

        // Mock the getExistingContent method to return existing content
        const deployer = new AgentsMDDeployer();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (deployer as any).getExistingContent = jest
          .fn()
          .mockResolvedValue(existingContent);

        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'Recipe instructions',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployRecipes(
          [recipeVersion],
          mockGitRepo,
          mockTarget,
        );

        expect(result.createOrUpdate).toHaveLength(1);
        const agentsMDFile = result.createOrUpdate[0];
        expect(agentsMDFile.content).toContain(existingContent);
        expect(agentsMDFile.content).toContain('# Packmind Recipes');
      });
    });

    describe('when recipe instructions are already present', () => {
      it('does not duplicate recipe instructions', async () => {
        const existingContent = `# Packmind Recipes

🚨 **MANDATORY STEP** 🚨

Before writing, editing, or generating ANY code:

**ALWAYS READ**: @.packmind/recipes-index.md to see what recipes are available`;

        // Mock the getExistingContent method to return content with existing instructions
        const deployer = new AgentsMDDeployer();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (deployer as any).getExistingContent = jest
          .fn()
          .mockResolvedValue(existingContent);

        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'Recipe instructions',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployRecipes(
          [recipeVersion],
          mockGitRepo,
          mockTarget,
        );

        // Should create update with properly formatted content using comment markers
        expect(result.createOrUpdate).toHaveLength(1);
        expect(result.delete).toHaveLength(0);
        expect(result.createOrUpdate[0].path).toBe('AGENTS.md'); // root target should have no prefix
        expect(result.createOrUpdate[0].content).toContain(
          '<!-- start: Packmind recipes -->',
        );
        expect(result.createOrUpdate[0].content).toContain(
          '<!-- end: Packmind recipes -->',
        );
      });
    });
  });
});
