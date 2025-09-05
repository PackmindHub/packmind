import { useGetMeQuery } from '../api/queries/UserQueries';
import { OrganizationId, UserId } from '@packmind/accounts/types';

export interface AuthContextUser {
  id: UserId;
  username: string;
  organizationId: OrganizationId;
}

export interface AuthContextOrganization {
  id: OrganizationId;
  name: string;
  slug: string;
}

export interface AuthContext {
  isAuthenticated: boolean;
  isLoading: boolean;
  user?: AuthContextUser;
  organization?: AuthContextOrganization;
  error?: Error;
}

/**
 * Hook that provides easy access to current user and organization context.
 * This is the single source of truth for authentication state in the app.
 *
 * @returns AuthContext with user, organization, and loading state
 */
export const useAuthContext = (): AuthContext => {
  const { data, isLoading, error } = useGetMeQuery();

  return {
    isAuthenticated: data?.authenticated || false,
    isLoading,
    user: data?.user,
    organization: data?.organization,
    error: error as Error | undefined,
  };
};
