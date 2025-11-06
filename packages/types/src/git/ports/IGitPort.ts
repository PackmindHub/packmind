import { GitProvider } from '../GitProvider';
import { GitRepo } from '../GitRepo';
import { OrganizationId } from '../../accounts/Organization';

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
