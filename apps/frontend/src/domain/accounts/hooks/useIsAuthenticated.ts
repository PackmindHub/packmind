import { useGetMeQuery } from '../api/queries';

/**
 * Checks if the user is authenticated by querying the backend session endpoint.
 * Returns { isAuthenticated, isLoading, error }
 */
export function useIsAuthenticated() {
  const { data, isLoading, error } = useGetMeQuery();

  return {
    isAuthenticated: data?.authenticated || false,
    organization: data?.organization || null,
    isLoading,
    error,
  };
}
