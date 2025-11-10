import { GetUsageByOrganizationUsecase } from './getUsageByOrganization.usecase';
import { RecipeUsageService } from '../../services/RecipeUsageService';
import {
  createRecipeUsageId,
  RecipeUsage,
} from '../../../domain/entities/RecipeUsage';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { createGitRepoId } from '@packmind/git';
import { stubLogger } from '@packmind/test-utils';
import { createRecipeId } from '@packmind/types';

describe('GetUsageByOrganizationUsecase', () => {
  let usecase: GetUsageByOrganizationUsecase;
  let mockRecipeUsageService: jest.Mocked<RecipeUsageService>;

  beforeEach(() => {
    mockRecipeUsageService = {
      getUsageByOrganization: jest.fn(),
    } as unknown as jest.Mocked<RecipeUsageService>;

    usecase = new GetUsageByOrganizationUsecase(
      mockRecipeUsageService,
      stubLogger(),
    );
  });

  describe('getUsageByOrganization', () => {
    it('returns usage records for organization', async () => {
      const organizationId = createOrganizationId('org-1');
      const mockUsages: RecipeUsage[] = [
        {
          id: createRecipeUsageId('usage-1'),
          recipeId: createRecipeId('recipe-1'),
          usedAt: new Date(),
          aiAgent: 'Cursor',
          gitRepoId: null,
          userId: createUserId('user-1'),
          targetId: null,
        },
        {
          id: createRecipeUsageId('usage-2'),
          recipeId: createRecipeId('recipe-2'),
          usedAt: new Date(),
          aiAgent: 'Claude',
          gitRepoId: createGitRepoId('repo-1'),
          userId: createUserId('user-2'),
          targetId: null,
        },
      ];

      mockRecipeUsageService.getUsageByOrganization.mockResolvedValue(
        mockUsages,
      );

      const result = await usecase.getUsageByOrganization(organizationId);

      expect(
        mockRecipeUsageService.getUsageByOrganization,
      ).toHaveBeenCalledWith(organizationId);
      expect(result).toEqual(mockUsages);
    });

    describe('when no usage records found', () => {
      it('returns empty array', async () => {
        const organizationId = createOrganizationId('org-1');
        mockRecipeUsageService.getUsageByOrganization.mockResolvedValue([]);

        const result = await usecase.getUsageByOrganization(organizationId);

        expect(
          mockRecipeUsageService.getUsageByOrganization,
        ).toHaveBeenCalledWith(organizationId);
        expect(result).toEqual([]);
      });
    });

    describe('when service fails', () => {
      it('throws error', async () => {
        const organizationId = createOrganizationId('org-1');
        const error = new Error('Database error');
        mockRecipeUsageService.getUsageByOrganization.mockRejectedValue(error);

        await expect(
          usecase.getUsageByOrganization(organizationId),
        ).rejects.toThrow('Database error');
        expect(
          mockRecipeUsageService.getUsageByOrganization,
        ).toHaveBeenCalledWith(organizationId);
      });
    });
  });
});
