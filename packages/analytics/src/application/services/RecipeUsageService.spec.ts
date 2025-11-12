import {
  RecipeUsage,
  createRecipeUsageId,
} from '../../domain/entities/RecipeUsage';
import { RecipeUsageService, TrackUsageData } from './RecipeUsageService';
import { IRecipeUsageRepository } from '../../domain/repositories/IRecipeUsageRepository';
import { createUserId } from '@packmind/types';
import {
  createRecipeId,
  createGitRepoId,
  createTargetId,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';

describe('RecipeUsageService', () => {
  let recipeUsageService: RecipeUsageService;
  let mockRecipeUsageRepository: jest.Mocked<IRecipeUsageRepository>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockRecipeUsageRepository = {
      add: jest.fn(),
      list: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByRecipeId: jest.fn(),
      listByOrganization: jest.fn(),
      listByRepository: jest.fn(),
      listByTarget: jest.fn(),
    } as unknown as jest.Mocked<IRecipeUsageRepository>;

    stubbedLogger = stubLogger();

    recipeUsageService = new RecipeUsageService(
      mockRecipeUsageRepository,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackRecipeUsage', () => {
    const usageData: TrackUsageData = {
      recipeId: createRecipeId('recipe-123'),
      aiAgent: 'Cursor',
      gitRepoId: createGitRepoId('repo-456'),
      userId: createUserId('user-789'),
    };

    const createdUsage: RecipeUsage = {
      id: createRecipeUsageId('usage-789'),
      recipeId: createRecipeId('recipe-123'),
      usedAt: new Date('2023-01-01'),
      aiAgent: 'Cursor',
      gitRepoId: createGitRepoId('repo-456'),
      userId: createUserId('user-789'),
      targetId: null,
    };

    beforeEach(() => {
      mockRecipeUsageRepository.add.mockResolvedValue(createdUsage);
    });

    it('creates and saves a new recipe usage record', async () => {
      const result = await recipeUsageService.trackRecipeUsage(usageData);

      expect(mockRecipeUsageRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          recipeId: usageData.recipeId,
          aiAgent: usageData.aiAgent,
          gitRepoId: usageData.gitRepoId,
          userId: usageData.userId,
          targetId: null,
          usedAt: expect.any(Date),
          id: expect.any(String),
        }),
      );
      expect(result).toEqual(createdUsage);
    });

    it('handles usage data without gitRepoId', async () => {
      const usageDataWithoutRepo: TrackUsageData = {
        recipeId: createRecipeId('recipe-123'),
        aiAgent: 'Cursor',
        userId: createUserId('user-789'),
      };

      await recipeUsageService.trackRecipeUsage(usageDataWithoutRepo);

      expect(mockRecipeUsageRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          recipeId: usageDataWithoutRepo.recipeId,
          aiAgent: usageDataWithoutRepo.aiAgent,
          gitRepoId: null,
          userId: usageDataWithoutRepo.userId,
          targetId: null,
          usedAt: expect.any(Date),
          id: expect.any(String),
        }),
      );
    });

    it('handles usage data with targetId', async () => {
      const targetId = createTargetId('target-123');
      const usageDataWithTarget: TrackUsageData = {
        recipeId: createRecipeId('recipe-123'),
        aiAgent: 'Cursor',
        userId: createUserId('user-789'),
        targetId,
      };

      await recipeUsageService.trackRecipeUsage(usageDataWithTarget);

      expect(mockRecipeUsageRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          recipeId: usageDataWithTarget.recipeId,
          aiAgent: usageDataWithTarget.aiAgent,
          gitRepoId: null,
          userId: usageDataWithTarget.userId,
          targetId,
          usedAt: expect.any(Date),
          id: expect.any(String),
        }),
      );
    });

    it('handles usage data without targetId (backward compatibility)', async () => {
      const usageDataWithoutTarget: TrackUsageData = {
        recipeId: createRecipeId('recipe-123'),
        aiAgent: 'Cursor',
        gitRepoId: createGitRepoId('repo-456'),
        userId: createUserId('user-789'),
      };

      await recipeUsageService.trackRecipeUsage(usageDataWithoutTarget);

      expect(mockRecipeUsageRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          recipeId: usageDataWithoutTarget.recipeId,
          aiAgent: usageDataWithoutTarget.aiAgent,
          gitRepoId: usageDataWithoutTarget.gitRepoId,
          userId: usageDataWithoutTarget.userId,
          targetId: null,
          usedAt: expect.any(Date),
          id: expect.any(String),
        }),
      );
    });

    it('throws an error on database failure', async () => {
      const error = new Error('Database error');
      mockRecipeUsageRepository.add.mockRejectedValue(error);

      await expect(
        recipeUsageService.trackRecipeUsage(usageData),
      ).rejects.toThrow('Database error');
    });
  });

  describe('getUsageByRecipeId', () => {
    it('delegates to repository with correct recipe ID', async () => {
      const recipeId = createRecipeId('recipe-123');
      const mockUsages: RecipeUsage[] = [
        {
          id: createRecipeUsageId('usage-1'),
          recipeId,
          usedAt: new Date(),
          aiAgent: 'Cursor',
          gitRepoId: null,
          userId: createUserId('user-123'),
          targetId: null,
        },
      ];

      mockRecipeUsageRepository.findByRecipeId.mockResolvedValue(mockUsages);

      const result = await recipeUsageService.getUsageByRecipeId(recipeId);

      expect(mockRecipeUsageRepository.findByRecipeId).toHaveBeenCalledWith(
        recipeId,
      );
      expect(result).toEqual(mockUsages);
    });

    it('returns empty array for nonexistent recipes', async () => {
      const recipeId = createRecipeId('nonexistent-recipe');
      mockRecipeUsageRepository.findByRecipeId.mockResolvedValue([]);

      const result = await recipeUsageService.getUsageByRecipeId(recipeId);

      expect(result).toEqual([]);
    });
  });

  describe('getAllUsage', () => {
    it('delegates to repository list method', async () => {
      const mockUsages: RecipeUsage[] = [
        {
          id: createRecipeUsageId('usage-1'),
          recipeId: createRecipeId('recipe-1'),
          usedAt: new Date(),
          aiAgent: 'Cursor',
          gitRepoId: null,
          userId: createUserId('user-123'),
          targetId: null,
        },
        {
          id: createRecipeUsageId('usage-2'),
          recipeId: createRecipeId('recipe-2'),
          usedAt: new Date(),
          aiAgent: 'Claude',
          gitRepoId: createGitRepoId('repo-1'),
          userId: createUserId('user-456'),
          targetId: null,
        },
      ];

      mockRecipeUsageRepository.list.mockResolvedValue(mockUsages);

      const result = await recipeUsageService.getAllUsage();

      expect(mockRecipeUsageRepository.list).toHaveBeenCalledWith();
      expect(result).toEqual(mockUsages);
    });

    it('returns empty array for empty database', async () => {
      mockRecipeUsageRepository.list.mockResolvedValue([]);

      const result = await recipeUsageService.getAllUsage();

      expect(result).toEqual([]);
    });
  });
});
