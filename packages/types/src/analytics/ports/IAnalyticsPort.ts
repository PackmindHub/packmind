import { GitRepoId } from '../../git/GitRepoId';
import { OrganizationId } from '../../accounts/Organization';
import { RecipeId } from '../../recipes/RecipeId';
import { TargetId } from '../../deployments/TargetId';
import { TrackRecipeUsageCommand } from '../contracts/ITrackRecipeUsage';
import { RecipeUsage } from '../RecipeUsage';
import {
  OrganizationUsageAnalytics,
  RepositoryUsageAnalytics,
  TargetUsageAnalytics,
  TimePeriod,
} from '../RecipeUsageAnalytics';

/**
 * Port interface for cross-domain access to Analytics functionality
 * Following DDD monorepo architecture standard
 */
export interface IAnalyticsPort {
  /**
   * Track recipe usage across different contexts
   */
  trackRecipeUsage(command: TrackRecipeUsageCommand): Promise<RecipeUsage[]>;

  /**
   * Get usage records for a specific recipe
   */
  getUsageByRecipeId(recipeId: RecipeId): Promise<RecipeUsage[]>;

  /**
   * Get usage records for an organization
   */
  getUsageByOrganization(
    organizationId: OrganizationId,
  ): Promise<RecipeUsage[]>;

  /**
   * Get usage records for a repository
   */
  getUsageByRepository(repositoryId: GitRepoId): Promise<RecipeUsage[]>;

  /**
   * Get usage records for a target
   */
  getUsageByTarget(targetId: TargetId): Promise<RecipeUsage[]>;

  /**
   * Get recipe usage analytics with flexible parameters
   */
  getRecipeUsageAnalytics(params: {
    organizationId?: OrganizationId;
    repositoryId?: GitRepoId;
    targetId?: TargetId;
    timePeriod?: TimePeriod;
  }): Promise<
    OrganizationUsageAnalytics | RepositoryUsageAnalytics | TargetUsageAnalytics
  >;

  /**
   * Get target-specific usage analytics
   */
  getTargetUsageAnalytics(
    targetId: TargetId,
    timePeriod?: TimePeriod,
  ): Promise<TargetUsageAnalytics>;
}

export const IAnalyticsPortName = 'IAnalyticsPort';
