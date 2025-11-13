import {
  OrganizationUsageAnalytics,
  TargetUsageAnalytics,
  TimePeriod,
  GitRepoId,
  TargetId,
} from '@packmind/types';

export interface IAnalyticsGateway {
  getRecipeUsageAnalytics(
    timePeriod?: TimePeriod,
    repositoryId?: GitRepoId,
    targetId?: TargetId,
  ): Promise<OrganizationUsageAnalytics | TargetUsageAnalytics>;
}
