import { GitProvider, GitProviderId } from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { IRepository } from '@packmind/types';

export interface IGitProviderRepository extends IRepository<GitProvider> {
  findByOrganizationId(organizationId: OrganizationId): Promise<GitProvider[]>;
  findByAppInstallation(
    organizationId: OrganizationId,
    appInstallationId: number,
  ): Promise<GitProvider | null>;
  update(
    id: string,
    gitProvider: Partial<Omit<GitProvider, 'id'>>,
  ): Promise<GitProvider>;
  /**
   * Soft-deletes the provider only while it holds no live repository, as one
   * statement, so a repository added concurrently keeps its provider.
   * Resolves whether the provider was deleted.
   */
  deleteIfHoldsNoRepository(
    id: GitProviderId,
    deletedBy: string,
  ): Promise<boolean>;
}
