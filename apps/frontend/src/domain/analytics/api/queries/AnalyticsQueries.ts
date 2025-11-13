import { useQuery } from '@tanstack/react-query';

import { analyticsGateway } from '../gateways';
import { TimePeriod, GitRepoId, TargetId } from '@packmind/types';
import { GET_RECIPE_USAGE_ANALYTICS_KEY } from '../queryKeys';

export const useGetRecipeUsageAnalyticsQuery = (
  timePeriod?: TimePeriod,
  repositoryId?: GitRepoId,
  targetId?: TargetId,
) => {
  return useQuery({
    queryKey: [
      ...GET_RECIPE_USAGE_ANALYTICS_KEY,
      timePeriod,
      repositoryId,
      targetId,
    ],
    queryFn: () => {
      return analyticsGateway.getRecipeUsageAnalytics(
        timePeriod,
        repositoryId,
        targetId,
      );
    },
  });
};

// Backward compatibility hook for repository-specific analytics
export const useGetRecipeUsageAnalyticsByRepositoryQuery = (
  repositoryId: GitRepoId,
  timePeriod?: TimePeriod,
) => {
  return useGetRecipeUsageAnalyticsQuery(timePeriod, repositoryId);
};

// Target-specific analytics hook with conditional loading
export const useGetUsageByTargetQuery = (
  targetId: TargetId | undefined,
  timePeriod?: TimePeriod,
) => {
  return useQuery({
    queryKey: [
      ...GET_RECIPE_USAGE_ANALYTICS_KEY,
      timePeriod,
      undefined,
      targetId,
    ],
    queryFn: () => {
      return analyticsGateway.getRecipeUsageAnalytics(
        timePeriod,
        undefined,
        targetId,
      );
    },
    enabled: !!targetId,
  });
};
