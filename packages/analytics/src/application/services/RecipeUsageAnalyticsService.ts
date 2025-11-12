import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  createRecipeId,
  GitRepoId,
  IRecipesPort,
  OrganizationId,
  TargetId,
} from '@packmind/types';
import { RecipeUsage } from '../../domain/entities/RecipeUsage';
import {
  AnalyticsFilters,
  OrganizationUsageAnalytics,
  RecipeUsageAnalytics,
  RepositoryUsageAnalytics,
  TargetUsageAnalytics,
  TimePeriod,
  TimePeriods,
} from '../../domain/entities/RecipeUsageAnalytics';

const origin = 'RecipeUsageAnalyticsService';

export class RecipeUsageAnalyticsService {
  constructor(
    private readonly recipesPort: IRecipesPort,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('RecipeUsageAnalyticsService initialized');
  }

  public async aggregateOrganizationUsage(
    usageRecords: RecipeUsage[],
    organizationId: OrganizationId,
    timePeriod: TimePeriod,
  ): Promise<OrganizationUsageAnalytics> {
    this.logger.info('Aggregating organization usage', {
      organizationId,
      timePeriod,
      recordCount: usageRecords.length,
    });

    const filteredRecords = this.filterByTimePeriod(usageRecords, timePeriod);
    const aggregatedRecipes = await this.aggregateByRecipe(filteredRecords);
    const sortedRecipes = this.sortByUsageCount(aggregatedRecipes);

    const totalUsage = filteredRecords.length;
    const totalRecipes = aggregatedRecipes.length;

    this.logger.info('Organization usage aggregated successfully', {
      organizationId,
      timePeriod,
      totalUsage,
      totalRecipes,
    });

    return {
      organizationId,
      timePeriod,
      totalRecipes,
      totalUsage,
      recipeUsageAnalytics: sortedRecipes,
    };
  }

  public async aggregateRepositoryUsage(
    usageRecords: RecipeUsage[],
    repositoryId: GitRepoId,
    timePeriod: TimePeriod,
  ): Promise<RepositoryUsageAnalytics> {
    this.logger.info('Aggregating repository usage', {
      repositoryId,
      timePeriod,
      recordCount: usageRecords.length,
    });

    const filteredRecords = this.filterByTimePeriod(usageRecords, timePeriod);
    const aggregatedRecipes = await this.aggregateByRecipe(filteredRecords);
    const sortedRecipes = this.sortByUsageCount(aggregatedRecipes);

    const totalUsage = filteredRecords.length;
    const totalRecipes = aggregatedRecipes.length;

    this.logger.info('Repository usage aggregated successfully', {
      repositoryId,
      timePeriod,
      totalUsage,
      totalRecipes,
    });

    return {
      repositoryId,
      timePeriod,
      totalRecipes,
      totalUsage,
      recipeUsageAnalytics: sortedRecipes,
    };
  }

  public async aggregateTargetUsage(
    usageRecords: RecipeUsage[],
    targetId: TargetId,
    timePeriod: TimePeriod,
  ): Promise<TargetUsageAnalytics> {
    this.logger.info('Aggregating target usage', {
      targetId,
      timePeriod,
      recordCount: usageRecords.length,
    });

    const filteredRecords = this.filterByTimePeriod(usageRecords, timePeriod);
    const aggregatedRecipes = await this.aggregateByRecipe(filteredRecords);
    const sortedRecipes = this.sortByUsageCount(aggregatedRecipes);

    const totalUsage = filteredRecords.length;
    const totalRecipes = aggregatedRecipes.length;

    this.logger.info('Target usage aggregated successfully', {
      targetId,
      timePeriod,
      totalUsage,
      totalRecipes,
    });

    return {
      targetId,
      timePeriod,
      totalRecipes,
      totalUsage,
      recipeUsageAnalytics: sortedRecipes,
    };
  }

  public filterByTimePeriod(
    usageRecords: RecipeUsage[],
    timePeriod: TimePeriod,
  ): RecipeUsage[] {
    const cutoffDate = this.getTimePeriodCutoff(timePeriod);

    this.logger.debug('Filtering records by time period', {
      timePeriod,
      cutoffDate,
      totalRecords: usageRecords.length,
    });

    const filteredRecords = usageRecords.filter(
      (record) => record.usedAt >= cutoffDate,
    );

    this.logger.debug('Records filtered by time period', {
      timePeriod,
      filteredCount: filteredRecords.length,
      originalCount: usageRecords.length,
    });

    return filteredRecords;
  }

  private async aggregateByRecipe(
    usageRecords: RecipeUsage[],
  ): Promise<RecipeUsageAnalytics[]> {
    this.logger.debug('Aggregating usage by recipe', {
      recordCount: usageRecords.length,
    });

    // Group by recipe
    const recipeGroups = usageRecords.reduce(
      (groups, record) => {
        const key = record.recipeId;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(record);
        return groups;
      },
      {} as Record<string, RecipeUsage[]>,
    );

    // Aggregate each group
    const aggregated: RecipeUsageAnalytics[] = [];

    for (const [recipeId, records] of Object.entries(recipeGroups)) {
      try {
        const recipe = await this.recipesPort.getRecipeByIdInternal(
          createRecipeId(recipeId),
        );
        if (!recipe) {
          this.logger.warn('Recipe not found during aggregation', { recipeId });
          continue;
        }

        const totalUsageCount = records.length;
        const lastUsedAt = new Date(
          Math.max(...records.map((r) => r.usedAt.getTime())),
        );

        aggregated.push({
          recipeId: recipe.id,
          recipeSlug: recipe.slug,
          recipeName: recipe.name,
          totalUsageCount,
          lastUsedAt,
        });
      } catch (error) {
        this.logger.error('Failed to aggregate recipe usage', {
          recipeId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.debug('Recipe aggregation completed', {
      originalRecords: usageRecords.length,
      aggregatedRecipes: aggregated.length,
    });

    return aggregated;
  }

  private sortByUsageCount(
    analytics: RecipeUsageAnalytics[],
  ): RecipeUsageAnalytics[] {
    return analytics.sort((a, b) => {
      // Primary sort: usage count (descending)
      const usageCountDiff = b.totalUsageCount - a.totalUsageCount;
      if (usageCountDiff !== 0) {
        return usageCountDiff;
      }
      // Secondary sort: recipe name (ascending) when usage counts are equal
      return a.recipeName.localeCompare(b.recipeName);
    });
  }

  private getTimePeriodCutoff(timePeriod: TimePeriod): Date {
    const now = new Date();
    const cutoff = new Date(now);

    switch (timePeriod) {
      case TimePeriods.LAST_7_DAYS:
        cutoff.setDate(now.getDate() - 7);
        break;
      case TimePeriods.LAST_MONTH:
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case TimePeriods.LAST_3_MONTHS:
        cutoff.setMonth(now.getMonth() - 3);
        break;
      default:
        throw new Error(`Unknown time period: ${timePeriod}`);
    }

    return cutoff;
  }

  public createAnalyticsFilters(timePeriod: TimePeriod): AnalyticsFilters {
    const cutoffDate = this.getTimePeriodCutoff(timePeriod);
    return {
      timePeriod,
      startDate: cutoffDate,
      endDate: new Date(),
    };
  }
}
