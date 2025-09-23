import { ListDeploymentsByRecipeUseCase } from './ListDeploymentsByRecipeUseCase';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import {
  RecipesDeployment,
  createRecipesDeploymentId,
} from '../../domain/entities/RecipesDeployment';
import { stubLogger } from '@packmind/shared/test';
import { RecipeId } from '@packmind/recipes';
import { OrganizationId, UserId } from '@packmind/accounts';
import {
  ListDeploymentsByRecipeCommand,
  DistributionStatus,
  createTargetId,
  GitRepoId,
} from '@packmind/shared';

describe('ListDeploymentsByRecipeUseCase', () => {
  let useCase: ListDeploymentsByRecipeUseCase;
  let mockRepository: Partial<IRecipesDeploymentRepository>;

  beforeEach(() => {
    mockRepository = {
      listByRecipeId: jest.fn(),
      listByOrganizationId: jest.fn(),
      listByOrganizationIdAndGitRepos: jest.fn(),
      findActiveRecipeVersionsByTarget: jest.fn(),
      add: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    };

    useCase = new ListDeploymentsByRecipeUseCase(
      mockRepository as IRecipesDeploymentRepository,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('lists deployments for a recipe', async () => {
      const command: ListDeploymentsByRecipeCommand = {
        recipeId: 'recipe-123' as RecipeId,
        organizationId: 'org-456' as OrganizationId,
        userId: 'user-789' as UserId,
      };
      const mockDeployments: RecipesDeployment[] = [
        {
          id: createRecipesDeploymentId('deployment-1'),
          organizationId: command.organizationId as OrganizationId,
          recipeVersions: [],
          target: {
            id: createTargetId('target-123'),
            name: 'Test Target',
            path: '/test',
            gitRepoId: 'repo-123' as GitRepoId,
          },
          status: DistributionStatus.success,
          authorId: 'author-123' as UserId,
          createdAt: new Date().toISOString(),
        },
      ];

      (mockRepository.listByRecipeId as jest.Mock).mockResolvedValue(
        mockDeployments,
      );

      const result = await useCase.execute(command);

      expect(result).toEqual(mockDeployments);
      expect(mockRepository.listByRecipeId).toHaveBeenCalledWith(
        command.recipeId,
        command.organizationId,
      );
    });

    describe('when listing deployments fails', () => {
      it('throws repository error', async () => {
        const command: ListDeploymentsByRecipeCommand = {
          recipeId: 'recipe-123' as RecipeId,
          organizationId: 'org-456' as OrganizationId,
          userId: 'user-789' as UserId,
        };
        const error = new Error('Repository error');

        (mockRepository.listByRecipeId as jest.Mock).mockRejectedValue(error);

        await expect(useCase.execute(command)).rejects.toThrow(
          'Repository error',
        );
      });
    });

    describe('when no deployments found', () => {
      it('returns empty array', async () => {
        const command: ListDeploymentsByRecipeCommand = {
          recipeId: 'recipe-123' as RecipeId,
          organizationId: 'org-456' as OrganizationId,
          userId: 'user-789' as UserId,
        };
        const mockDeployments: RecipesDeployment[] = [];

        (mockRepository.listByRecipeId as jest.Mock).mockResolvedValue(
          mockDeployments,
        );

        const result = await useCase.execute(command);

        expect(result).toEqual([]);
      });
    });
  });
});
