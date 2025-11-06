import { useGetMeQuery } from '../api/queries/UserQueries';
import {
  OrganizationId,
  UserId,
  UserOrganizationMembership,
  UserOrganizationRole,
} from '@packmind/types';
import { Organization } from '@packmind/types';
import { useAuthService } from '../../../providers/AuthProvider';
import type { OrganizationSwitchResult } from '../../../services/auth/AuthService';
import { MeResponse } from '../api/gateways/IAuthGateway';

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
  // Reactive data properties
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

  // Public AuthService methods (implementation details hidden)
  getMe: () => Promise<MeResponse>;
  getUserOrganizations: () => Promise<Organization[]>;
  validateAndSwitchIfNeeded: (
    targetOrgSlug: string,
  ) => Promise<OrganizationSwitchResult>;
}

/**
 * Hook that provides easy access to current user and organization context.
 * This is the single source of truth for authentication state in the app.
 *
 * Uses TanStack Query for reactive data while exposing AuthService methods for imperative operations.
 * - For reactive data: use the returned user/organization properties
 * - For operations (like switching orgs): call validateAndSwitchIfNeeded() directly
 *
 * @returns AuthContext with user, organization, loading state, and auth operations
 */
export const useAuthContext = (): AuthContext => {
  // Get AuthService instance from provider (implementation detail hidden from consumers)
  const authService = useAuthService();

  // Use TanStack Query hooks for reactive data
  const { data, isLoading, error } = useGetMeQuery();

  return {
    // Reactive data
    isAuthenticated: data?.authenticated || false,
    isLoading,
    user: data?.user,
    organization: data?.organization,
    organizations: data?.organizations,
    error: error as Error | undefined,

    // Exposed public methods (bound to authService instance)
    getMe: () => authService.getMe(),
    getUserOrganizations: () => authService.getUserOrganizations(),
    validateAndSwitchIfNeeded: (targetOrgSlug: string) =>
      authService.validateAndSwitchIfNeeded(targetOrgSlug),
  };
};
