import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { searchGateway } from '../gateways';
import { searchQueryKeys } from '../queryKeys';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';

/**
 * Query options for the global search. The query is enabled only once the
 * trimmed term is at least 2 characters long (per the feature contract) and an
 * organization context exists. `keepPreviousData` keeps the previous results
 * visible while a new keystroke's query is in flight.
 */
export const getSearchQueryOptions = (orgId: string, query: string) =>
  queryOptions({
    queryKey: searchQueryKeys.list(orgId, query),
    queryFn: async () => {
      if (!orgId) {
        throw new Error('Cannot search: organization ID is required');
      }
      return searchGateway.search(orgId, query);
    },
    enabled: !!orgId && query.trim().length >= 2,
    staleTime: 30_000, // search results are short-lived
    placeholderData: keepPreviousData,
  });

/**
 * Hook used by the global search bar. Reads the current organization from the
 * auth context and runs the search query for the given term.
 */
export const useSearchQuery = (query: string) => {
  const { organization } = useAuthContext();
  const orgId = organization?.id;
  return useQuery(getSearchQueryOptions(orgId || '', query));
};
