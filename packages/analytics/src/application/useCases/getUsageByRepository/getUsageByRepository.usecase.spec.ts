import { GetUsageByRepositoryUsecase } from './getUsageByRepository.usecase';
import { RecipeUsageService } from '../../services/RecipeUsageService';
import {
  createRecipeUsageId,
  RecipeUsage,
} from '../../../domain/entities/RecipeUsage';
import { createUserId } from '@packmind/accounts';
import { createGitRepoId } from '@packmind/git';
import { stubLogger } from '@packmind/test-utils';
import { createRecipeId } from '@packmind/types';

describe('GetUsageByRepositoryUsecase', () => {
  let usecase: GetUsageByRepositoryUsecase;
  let mockRecipeUsageService: jest.Mocked<RecipeUsageService>;

  beforeEach(() => {
    mockRecipeUsageService = {
      getUsageByRepository: jest.fn(),
    } as unknown as jest.Mocked<RecipeUsageService>;

    usecase = new GetUsageByRepositoryUsecase(
      mockRecipeUsageService,
      stubLogger(),
    );
  });

  describe('getUsageByRepository', () => {
    const testRepositoryId = createGitRepoId('test-repo-123');

    it('returns usage records for repository', async () => {
      const mockUsage: RecipeUsage = {
        id: createRecipeUsageId('usage-1'),
        recipeId: createRecipeId('recipe-1'),
        aiAgent: 'Cursor',
        usedAt: new Date(),
        userId: createUserId('user-1'),
        gitRepoId: testRepositoryId,
        targetId: null,
      };

      mockRecipeUsageService.getUsageByRepository.mockResolvedValue([
        mockUsage,
      ]);

      const result = await usecase.getUsageByRepository(testRepositoryId);

      expect(mockRecipeUsageService.getUsageByRepository).toHaveBeenCalledWith(
        testRepositoryId,
      );
      expect(result).toEqual([mockUsage]);
    });

    describe('when no usage records exist for repository', () => {
      it('returns empty array', async () => {
        mockRecipeUsageService.getUsageByRepository.mockResolvedValue([]);

        const result = await usecase.getUsageByRepository(testRepositoryId);

        expect(
          mockRecipeUsageService.getUsageByRepository,
        ).toHaveBeenCalledWith(testRepositoryId);
        expect(result).toEqual([]);
      });
    });

    describe('when service fails', () => {
      it('throws error', async () => {
        const error = new Error('Database connection failed');
        mockRecipeUsageService.getUsageByRepository.mockRejectedValue(error);

        await expect(
          usecase.getUsageByRepository(testRepositoryId),
        ).rejects.toThrow('Database connection failed');

        expect(
          mockRecipeUsageService.getUsageByRepository,
        ).toHaveBeenCalledWith(testRepositoryId);
      });
    });
  });
});
