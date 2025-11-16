import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const ANALYTICS_QUERY_SCOPE = 'analytics';

export enum AnalyticsQueryKeys {
  GET_RECIPE_USAGE_ANALYTICS = 'get-recipe-usage-analytics',
}

// Base query key arrays for reuse
export const GET_RECIPE_USAGE_ANALYTICS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  ANALYTICS_QUERY_SCOPE,
  AnalyticsQueryKeys.GET_RECIPE_USAGE_ANALYTICS,
] as const;
