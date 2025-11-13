import {
  GitRepoId,
  IAnalyticsPort,
  OrganizationId,
  OrganizationUsageAnalytics,
  RecipeId,
  RecipeUsage,
  RepositoryUsageAnalytics,
  TargetId,
  TargetUsageAnalytics,
  TimePeriod,
  TrackRecipeUsageCommand,
} from '@packmind/types';

/**
 * OSS stub implementation of AnalyticsAdapter
 * All methods return empty arrays or default values
 */
export class AnalyticsAdapter implements IAnalyticsPort {
  async trackRecipeUsage(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: TrackRecipeUsageCommand,
  ): Promise<RecipeUsage[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getUsageByRecipeId(recipeId: RecipeId): Promise<RecipeUsage[]> {
    return [];
  }

  async getUsageByOrganization(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    organizationId: OrganizationId,
  ): Promise<RecipeUsage[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getUsageByRepository(repositoryId: GitRepoId): Promise<RecipeUsage[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getUsageByTarget(targetId: TargetId): Promise<RecipeUsage[]> {
    return [];
  }

  async getRecipeUsageAnalytics(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    params: {
      organizationId?: OrganizationId;
      repositoryId?: GitRepoId;
      targetId?: TargetId;
      timePeriod?: TimePeriod;
    },
  ): Promise<
    OrganizationUsageAnalytics | RepositoryUsageAnalytics | TargetUsageAnalytics
  > {
    // Return empty organization analytics by default
    return {
      organizationId: '' as unknown as OrganizationId,
      timePeriod: 'LAST_7_DAYS',
      totalRecipes: 0,
      totalUsage: 0,
      recipeUsageAnalytics: [],
    } as OrganizationUsageAnalytics;
  }

  async getTargetUsageAnalytics(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    targetId: TargetId,
    timePeriod?: TimePeriod,
  ): Promise<TargetUsageAnalytics> {
    return {
      targetId: '' as unknown as TargetId,
      timePeriod: timePeriod || 'LAST_7_DAYS',
      totalRecipes: 0,
      totalUsage: 0,
      recipeUsageAnalytics: [],
    };
  }
}
