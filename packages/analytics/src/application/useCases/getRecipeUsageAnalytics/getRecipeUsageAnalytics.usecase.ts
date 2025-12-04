import { LogLevel, PackmindLogger } from '@packmind/logger';
import { GitRepoId, OrganizationId, TargetId } from '@packmind/types';
import {
  OrganizationUsageAnalytics,
  RepositoryUsageAnalytics,
  TargetUsageAnalytics,
  TimePeriod,
  TimePeriods,
} from '../../../domain/entities/RecipeUsageAnalytics';
import { RecipeUsageAnalyticsService } from '../../services/RecipeUsageAnalyticsService';
import { RecipeUsageService } from '../../services/RecipeUsageService';

const origin = 'GetRecipeUsageAnalyticsUsecase';

export interface GetRecipeUsageAnalyticsParams {
  organizationId?: OrganizationId;
  repositoryId?: GitRepoId;
  targetId?: TargetId;
  timePeriod?: TimePeriod;
}

export class GetRecipeUsageAnalyticsUsecase {
  constructor(
    private readonly recipeUsageService: RecipeUsageService,
    private readonly recipeUsageAnalyticsService: RecipeUsageAnalyticsService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetRecipeUsageAnalyticsUsecase initialized');
  }

  public async getRecipeUsageAnalytics(
    params: GetRecipeUsageAnalyticsParams,
  ): Promise<
    OrganizationUsageAnalytics | RepositoryUsageAnalytics | TargetUsageAnalytics
  > {
    const {
      organizationId,
      repositoryId,
      timePeriod = TimePeriods.LAST_3_MONTHS,
      targetId,
    } = params;

    if (organizationId && repositoryId && targetId) {
      throw new Error('Cannot specify both organizationId and repositoryId');
    }

    if (!organizationId && !repositoryId && !targetId) {
      throw new Error('Must specify either organizationId or repositoryId');
    }

    if (organizationId) {
      return this.getOrganizationUsageAnalytics(organizationId, timePeriod);
    } else if (repositoryId) {
      return this.getRepositoryUsageAnalytics(repositoryId, timePeriod);
    } else if (targetId) {
      return this.getTargetUsageAnalytics(targetId, timePeriod);
    } else {
      throw new Error('This should never happen due to validation above');
    }
  }

  public async getTargetUsageAnalytics(
    targetId: TargetId,
    timePeriod: TimePeriod = TimePeriods.LAST_3_MONTHS,
  ): Promise<TargetUsageAnalytics> {
    this.logger.info('Getting aggregated usage analytics for target', {
      targetId,
      timePeriod,
    });

    try {
      const usageRecords =
        await this.recipeUsageService.getUsageByTarget(targetId);

      const analytics =
        await this.recipeUsageAnalyticsService.aggregateTargetUsage(
          usageRecords,
          targetId,
          timePeriod,
        );

      this.logger.info('Target usage analytics retrieved successfully', {
        targetId,
        timePeriod,
        totalRecipes: analytics.totalRecipes,
        totalUsage: analytics.totalUsage,
      });

      return analytics;
    } catch (error) {
      this.logger.error('Failed to get target usage analytics', {
        targetId,
        timePeriod,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async getOrganizationUsageAnalytics(
    organizationId: OrganizationId,
    timePeriod: TimePeriod,
  ): Promise<OrganizationUsageAnalytics> {
    this.logger.info('Getting aggregated usage analytics for organization', {
      organizationId,
      timePeriod,
    });

    try {
      const usageRecords =
        await this.recipeUsageService.getUsageByOrganization(organizationId);

      const analytics =
        await this.recipeUsageAnalyticsService.aggregateOrganizationUsage(
          usageRecords,
          organizationId,
          timePeriod,
        );

      this.logger.info('Organization usage analytics retrieved successfully', {
        organizationId,
        timePeriod,
        totalRecipes: analytics.totalRecipes,
        totalUsage: analytics.totalUsage,
      });

      return analytics;
    } catch (error) {
      this.logger.error('Failed to get organization usage analytics', {
        organizationId,
        timePeriod,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async getRepositoryUsageAnalytics(
    repositoryId: GitRepoId,
    timePeriod: TimePeriod,
  ): Promise<RepositoryUsageAnalytics> {
    this.logger.info('Getting aggregated usage analytics for repository', {
      repositoryId,
      timePeriod,
    });

    try {
      const usageRecords =
        await this.recipeUsageService.getUsageByRepository(repositoryId);

      const analytics =
        await this.recipeUsageAnalyticsService.aggregateRepositoryUsage(
          usageRecords,
          repositoryId,
          timePeriod,
        );

      this.logger.info('Repository usage analytics retrieved successfully', {
        repositoryId,
        timePeriod,
        totalRecipes: analytics.totalRecipes,
        totalUsage: analytics.totalUsage,
      });

      return analytics;
    } catch (error) {
      this.logger.error('Failed to get repository usage analytics', {
        repositoryId,
        timePeriod,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
