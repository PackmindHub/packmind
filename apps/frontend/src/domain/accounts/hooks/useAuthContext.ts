import { useGetMeQuery } from '../api/queries/UserQueries';
import {
  OrganizationId,
  UserId,
  UserOrganizationMembership,
  UserOrganizationRole,
} from '@packmind/accounts/types';

export interface AuthContextUser {
  id: UserId;
  email: string;
  memberships: UserOrganizationMembership[];
}

export interface AuthContextOrganization {
  id: OrganizationId;
  name: string;
  slug: string;
  role: UserOrganizationRole;
}

export interface AuthContext {
  isAuthenticated: boolean;
  isLoading: boolean;
  user?: AuthContextUser;
  organization?: AuthContextOrganization;
  organizations?: Array<{
    organization: {
      id: OrganizationId;
      name: string;
      slug: string;
    };
    role: UserOrganizationRole;
  }>;
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
    organizations: data?.organizations,
    error: error as Error | undefined,
  };
};
