import { QueryClient } from '@tanstack/react-query';
import { Organization } from '@packmind/types';
import {
  getMeQueryOptions,
  getUserOrganizationsQueryOptions,
  getSelectOrganizationQueryOptions,
  GET_ME_KEY,
  GET_USER_ORGANIZATIONS_KEY,
} from '../../domain/accounts/api/queries';
import { MeResponse } from '../../domain/accounts/api/gateways/IAuthGateway';
import { ORGANIZATION_QUERY_SCOPE } from '../../domain/organizations/api/queryKeys';

export interface OrganizationSwitchResult {
  success: boolean;
  hasAccess: boolean;
  updatedMe?: MeResponse;
  targetOrganization?: Organization;
  currentOrganizationSlug?: string;
}

/**
 * AuthService - Singleton service managing authentication logic
 *
 * Provides centralized authentication operations accessible anywhere in the app.
 * Must be initialized with QueryClient before use.
 */
export class AuthService {
  private static instance: AuthService | null = null;
  private queryClient: QueryClient | null = null;

  // Static flags for org switching state
  private static isSwitchingOrg = false;
  private static targetOrgSlug: string | null = null;

  static getIsSwitching(): boolean {
    return AuthService.isSwitchingOrg;
  }

  static getTargetOrgSlug(): string | null {
    return AuthService.targetOrgSlug;
  }

  // Private constructor for singleton pattern
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize the service with a QueryClient instance.
   * Should be called once during app initialization.
   */
  initialize(queryClient: QueryClient): void {
    this.queryClient = queryClient;
  }

  private ensureInitialized(): QueryClient {
    if (!this.queryClient) {
      throw new Error(
        'AuthService not initialized. Call initialize(queryClient) first.',
      );
    }
    return this.queryClient;
  }

  /**
   * Fetches the current authenticated user information
   */
  async getMe(): Promise<MeResponse> {
    const queryClient = this.ensureInitialized();
    return queryClient.fetchQuery(getMeQueryOptions());
  }

  /**
   * Fetches all organizations the user belongs to
   */
  async getUserOrganizations(): Promise<Organization[]> {
    const queryClient = this.ensureInitialized();
    return queryClient.fetchQuery(getUserOrganizationsQueryOptions());
  }

  /**
   * Validates if user has access to the target organization and switches if needed.
   *
   * Business logic flow:
   * 1. Fetch all user's organizations
   * 2. Find the target organization by slug
   * 3. If found, switch to it and invalidate all queries
   * 4. Return result with access status
   */
  async validateAndSwitchIfNeeded(
    targetOrgSlug: string,
  ): Promise<OrganizationSwitchResult> {
    AuthService.isSwitchingOrg = true;
    AuthService.targetOrgSlug = targetOrgSlug;

    try {
      const queryClient = this.ensureInitialized();

      // Fetch all user's organizations
      const organizations = await queryClient.fetchQuery(
        getUserOrganizationsQueryOptions(),
      );

      // Find the target organization
      const targetOrganization = organizations.find(
        (org) => org.slug === targetOrgSlug,
      );

      if (!targetOrganization) {
        // User doesn't have access to this organization
        return {
          success: false,
          hasAccess: false,
        };
      }

      // Switch to the target organization
      await queryClient.fetchQuery(
        getSelectOrganizationQueryOptions(targetOrganization.id),
      );

      // Stop any in-flight organization-scoped queries before clearing the cache
      await queryClient.cancelQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE],
      });

      // Remove all organization-scoped queries from the cache
      // This prevents stale queries from refetching with the wrong org context
      await queryClient.removeQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE],
      });

      // Explicitly remove ME and USER_ORGS to be absolutely safe
      await queryClient.removeQueries({ queryKey: GET_ME_KEY });
      await queryClient.removeQueries({ queryKey: GET_USER_ORGANIZATIONS_KEY });

      // Fetch updated me data (this will be fresh since we removed the cached query)
      const updatedMe = await queryClient.fetchQuery(getMeQueryOptions());

      return {
        success: true,
        hasAccess: true,
        updatedMe,
        targetOrganization,
      };
    } finally {
      AuthService.isSwitchingOrg = false;
      AuthService.targetOrgSlug = null;
    }
  }
}
