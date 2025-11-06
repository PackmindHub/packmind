import { GitProvider, GitRepo } from '../git';
import { OrganizationId } from '@packmind/types';

export interface IGitPort {
  /**
   * List all git providers for an organization
   *
   * @param organizationId - The organization ID
   * @returns Promise of array of git providers
   */
  listProviders(organizationId: OrganizationId): Promise<GitProvider[]>;

  /**
   * Get all repositories for an organization
   *
   * @param organizationId - The organization ID
   * @returns Promise of array of git repositories
   */
  getOrganizationRepositories(
    organizationId: OrganizationId,
  ): Promise<GitRepo[]>;
}
