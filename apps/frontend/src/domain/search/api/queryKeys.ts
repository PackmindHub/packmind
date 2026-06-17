import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const SEARCH_SCOPE = 'search' as const;

export const searchQueryKeys = {
  all: [ORGANIZATION_QUERY_SCOPE, SEARCH_SCOPE] as const,
  lists: () => [...searchQueryKeys.all, 'list'] as const,
  list: (orgId: string, query: string) =>
    [...searchQueryKeys.lists(), orgId, query] as const,
};
