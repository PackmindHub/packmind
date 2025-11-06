import { GitRepoId } from '../git/GitRepoId';
import { OrganizationId } from '../accounts/Organization';
import { RecipeId } from '../recipes/RecipeId';
import { TargetId } from '../deployments/TargetId';

export type TimePeriod = 'LAST_7_DAYS' | 'LAST_MONTH' | 'LAST_3_MONTHS';

export const TimePeriods: Record<TimePeriod, TimePeriod> = {
  LAST_7_DAYS: 'LAST_7_DAYS',
  LAST_MONTH: 'LAST_MONTH',
  LAST_3_MONTHS: 'LAST_3_MONTHS',
};

export interface RecipeUsageAnalytics {
  recipeId: RecipeId;
  recipeSlug: string;
  recipeName: string;
  totalUsageCount: number;
  lastUsedAt: Date;
}

export interface OrganizationUsageAnalytics {
  organizationId: OrganizationId;
  timePeriod: TimePeriod;
  totalRecipes: number;
  totalUsage: number;
  recipeUsageAnalytics: RecipeUsageAnalytics[];
}

export interface RepositoryUsageAnalytics {
  repositoryId: GitRepoId;
  timePeriod: TimePeriod;
  totalRecipes: number;
  totalUsage: number;
  recipeUsageAnalytics: RecipeUsageAnalytics[];
}

export interface TargetUsageAnalytics {
  targetId: TargetId;
  timePeriod: TimePeriod;
  totalRecipes: number;
  totalUsage: number;
  recipeUsageAnalytics: RecipeUsageAnalytics[];
}

export interface AnalyticsFilters {
  timePeriod: TimePeriod;
  startDate?: Date;
  endDate?: Date;
}

export interface RecipeUsageAggregation {
  recipeId: RecipeId;
  recipeSlug: string;
  usageCount: number;
  lastUsedAt: Date;
}
