import { PrepareRecipesDeploymentUseCase } from './PrepareRecipesDeploymentUseCase';
import { FileUpdates } from '../../domain/entities/FileUpdates';
import { PrepareRecipesDeploymentCommand } from '../../domain/useCases/IPrepareRecipesDeploymentUseCase';
import { createUserId } from '@packmind/types';
import {
  createRecipeVersionId,
  createGitRepoId,
  createGitProviderId,
  createTargetId,
} from '@packmind/types';
import { recipeFactory } from '@packmind/recipes/test';

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

    const mockRecipe = recipeFactory({
      name: 'Test Recipe',
      slug: 'test-recipe',
    });

    mockCommand = {
      recipeVersions: [
        {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: mockRecipe.id,
          name: mockRecipe.name,
          slug: mockRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Test recipe summary',
          userId: createUserId('user-1'),
        },
      ],
      gitRepo: {
        id: createGitRepoId('repo-1'),
        owner: 'test-owner',
        repo: 'test-repo',
        providerId: createGitProviderId('provider-1'),
        branch: 'main',
      },
      targets: [
        {
          id: createTargetId('test-target-id'),
          name: 'Test Target',
          path: '/',
          gitRepoId: createGitRepoId('repo-1'),
        },
      ],
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
        mockCommand.targets,
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
