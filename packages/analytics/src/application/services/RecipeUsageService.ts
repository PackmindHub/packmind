import { v4 as uuidv4 } from 'uuid';

import {
  RecipeUsage,
  createRecipeUsageId,
} from '../../domain/entities/RecipeUsage';
import { IRecipeUsageRepository } from '../../domain/repositories/IRecipeUsageRepository';
import { RecipeUsageRepository } from '../../infra/repositories/RecipeUsageRepository';
import { PackmindLogger } from '@packmind/logger';
import { RecipeId, TargetId } from '@packmind/types';
import { GitRepoId } from '@packmind/git';
import { OrganizationId, UserId } from '@packmind/accounts';

const origin = 'RecipeUsageService';

export type TrackUsageData = {
  recipeId: RecipeId;
  aiAgent: string;
  gitRepoId?: GitRepoId | null;
  userId: UserId;
  targetId?: TargetId | null;
};

export class RecipeUsageService {
  constructor(
    private readonly recipeUsageRepository: IRecipeUsageRepository = new RecipeUsageRepository(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('RecipeUsageService initialized');
  }

  async trackRecipeUsage(usageData: TrackUsageData): Promise<RecipeUsage> {
    this.logger.info('Tracking recipe usage', {
      recipeId: usageData.recipeId,
      aiAgent: usageData.aiAgent,
      gitRepoId: usageData.gitRepoId,
      userId: usageData.userId,
      targetId: usageData.targetId,
    });

    try {
      const usage: RecipeUsage = {
        id: createRecipeUsageId(uuidv4()),
        recipeId: usageData.recipeId,
        usedAt: new Date(),
        aiAgent: usageData.aiAgent,
        gitRepoId: usageData.gitRepoId || null,
        userId: usageData.userId,
        targetId: usageData.targetId || null,
      };

      this.logger.debug('Creating usage record', {
        usageId: usage.id,
        recipeId: usageData.recipeId,
        gitRepoId: usageData.gitRepoId,
        userId: usageData.userId,
        targetId: usageData.targetId,
      });

      const savedUsage = await this.recipeUsageRepository.add(usage);

      this.logger.info('Usage record created successfully', {
        usageId: savedUsage.id,
        recipeId: usageData.recipeId,
        gitRepoId: usageData.gitRepoId,
        userId: usageData.userId,
        targetId: usageData.targetId,
      });

      return savedUsage;
    } catch (error) {
      this.logger.error('Failed to track recipe usage', {
        recipeId: usageData.recipeId,
        aiAgent: usageData.aiAgent,
        userId: usageData.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async trackMultipleRecipeUsages(
    usageDataList: TrackUsageData[],
  ): Promise<RecipeUsage[]> {
    this.logger.info('Tracking multiple recipe usages', {
      count: usageDataList.length,
    });

    const usageRecords: RecipeUsage[] = [];

    try {
      for (const usageData of usageDataList) {
        try {
          const savedUsage = await this.trackRecipeUsage(usageData);
          usageRecords.push(savedUsage);
        } catch (error) {
          this.logger.error('Failed to save individual usage record', {
            recipeId: usageData.recipeId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      this.logger.info('Multiple recipe usages tracked successfully', {
        total: usageDataList.length,
        successful: usageRecords.length,
      });

      return usageRecords;
    } catch (error) {
      this.logger.error('Failed to track multiple recipe usages', {
        count: usageDataList.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getUsageByRecipeId(recipeId: RecipeId): Promise<RecipeUsage[]> {
    this.logger.info('Getting usage records for recipe', { recipeId });

    try {
      const usageRecords =
        await this.recipeUsageRepository.findByRecipeId(recipeId);
      this.logger.info('Usage records retrieved successfully', {
        recipeId,
        count: usageRecords.length,
      });
      return usageRecords;
    } catch (error) {
      this.logger.error('Failed to get usage records for recipe', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getAllUsage(): Promise<RecipeUsage[]> {
    this.logger.info('Getting all usage records');

    try {
      const usageRecords = await this.recipeUsageRepository.list();
      this.logger.info('All usage records retrieved successfully', {
        count: usageRecords.length,
      });
      return usageRecords;
    } catch (error) {
      this.logger.error('Failed to get all usage records', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getUsageByOrganization(
    organizationId: OrganizationId,
  ): Promise<RecipeUsage[]> {
    this.logger.info('Getting usage records for organization', {
      organizationId,
    });

    try {
      const usageRecords =
        await this.recipeUsageRepository.listByOrganization(organizationId);
      this.logger.info(
        'Usage records retrieved for organization successfully',
        {
          organizationId,
          count: usageRecords.length,
        },
      );
      return usageRecords;
    } catch (error) {
      this.logger.error('Failed to get usage records for organization', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getUsageByRepository(repositoryId: GitRepoId): Promise<RecipeUsage[]> {
    this.logger.info('Getting usage records for repository', {
      repositoryId,
    });

    try {
      const usageRecords =
        await this.recipeUsageRepository.listByRepository(repositoryId);
      this.logger.info('Usage records retrieved for repository successfully', {
        repositoryId,
        count: usageRecords.length,
      });
      return usageRecords;
    } catch (error) {
      this.logger.error('Failed to get usage records for repository', {
        repositoryId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getUsageByTarget(targetId: TargetId): Promise<RecipeUsage[]> {
    this.logger.info('Getting usage records for target', {
      targetId,
    });

    try {
      const usageRecords =
        await this.recipeUsageRepository.listByTarget(targetId);
      this.logger.info('Usage records retrieved for target successfully', {
        targetId,
        count: usageRecords.length,
      });
      return usageRecords;
    } catch (error) {
      this.logger.error('Failed to get usage records for target', {
        targetId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
