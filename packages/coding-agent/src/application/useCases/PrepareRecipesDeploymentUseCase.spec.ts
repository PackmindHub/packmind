import { PrepareRecipesDeploymentUseCase } from './PrepareRecipesDeploymentUseCase';
import { RecipeVersionId, Recipe, RecipeId } from '@packmind/recipes';
import { GitRepoId, GitProviderId } from '@packmind/git';
import { FileUpdates } from '../../domain/entities/FileUpdates';
import { OrganizationId, UserId } from '@packmind/accounts';
import { PrepareRecipesDeploymentCommand } from '../../domain/useCases/IPrepareRecipesDeploymentUseCase';

// Create test helper functions
const createTestRecipeId = (id: string): RecipeId => id as RecipeId;
const createTestRecipeVersionId = (id: string): RecipeVersionId =>
  id as RecipeVersionId;
const createTestOrganizationId = (id: string): OrganizationId =>
  id as OrganizationId;
const createTestUserId = (id: string): UserId => id as UserId;
const createTestGitRepoId = (id: string): GitRepoId => id as GitRepoId;
const createTestGitProviderId = (id: string): GitProviderId =>
  id as GitProviderId;

// Mock services
class MockCodingAgentServices {
  async prepareRecipesDeployment(): Promise<FileUpdates> {
    return {
      createOrUpdate: [{ path: 'recipe.md', content: 'content' }],
      delete: [],
    };
  }

  async prepareStandardsDeployment(): Promise<FileUpdates> {
    return { createOrUpdate: [], delete: [] };
  }
}

describe('PrepareRecipesDeploymentUseCase', () => {
  let useCase: PrepareRecipesDeploymentUseCase;
  let mockServices: MockCodingAgentServices;
  let mockCommand: PrepareRecipesDeploymentCommand;

  beforeEach(() => {
    mockServices = new MockCodingAgentServices();
    useCase = new PrepareRecipesDeploymentUseCase(
      mockServices as unknown as import('../services/CodingAgentServices').CodingAgentServices,
    );

    const mockRecipe: Recipe = {
      id: createTestRecipeId('recipe-1'),
      name: 'Test Recipe',
      slug: 'test-recipe',
      content: 'Original recipe content',
      version: 1,
      organizationId: createTestOrganizationId('org-1'),
      userId: createTestUserId('user-1'),
    };

    mockCommand = {
      recipeVersions: [
        {
          id: createTestRecipeVersionId('recipe-version-1'),
          recipeId: mockRecipe.id,
          name: mockRecipe.name,
          slug: mockRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Test recipe summary',
          userId: createTestUserId('user-1'),
        },
      ],
      gitRepo: {
        id: createTestGitRepoId('repo-1'),
        owner: 'test-owner',
        repo: 'test-repo',
        providerId: createTestGitProviderId('provider-1'),
        branch: 'main',
      },
      codingAgents: ['packmind'],
    };
  });

  describe('execute', () => {
    it('executes successfully and returns file updates', async () => {
      const fileUpdates = await useCase.execute(mockCommand);

      expect(fileUpdates).toBeDefined();
      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.createOrUpdate[0]).toEqual({
        path: 'recipe.md',
        content: 'content',
      });
      expect(fileUpdates.delete).toHaveLength(0);
    });

    it('calls services with correct parameters', async () => {
      const spy = jest.spyOn(mockServices, 'prepareRecipesDeployment');

      await useCase.execute(mockCommand);

      expect(spy).toHaveBeenCalledWith(
        mockCommand.recipeVersions,
        mockCommand.gitRepo,
        mockCommand.codingAgents,
      );
    });

    it('handles and propagates service errors', async () => {
      jest
        .spyOn(mockServices, 'prepareRecipesDeployment')
        .mockRejectedValue(new Error('Service error'));

      await expect(useCase.execute(mockCommand)).rejects.toThrow(
        'Service error',
      );
    });

    it('handles empty recipes array', async () => {
      const commandWithEmptyRecipes = {
        ...mockCommand,
        recipes: [],
      };

      const fileUpdates = await useCase.execute(commandWithEmptyRecipes);

      expect(fileUpdates).toBeDefined();
    });

    it('handles empty coding agents array', async () => {
      const commandWithEmptyAgents = {
        ...mockCommand,
        codingAgents: [],
      };

      const fileUpdates = await useCase.execute(commandWithEmptyAgents);

      expect(fileUpdates).toBeDefined();
    });
  });
});
