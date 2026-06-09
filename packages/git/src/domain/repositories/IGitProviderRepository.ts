import { GitProvider } from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { IRepository } from '@packmind/types';

export interface IGitProviderRepository extends IRepository<GitProvider> {
  findByOrganizationId(organizationId: OrganizationId): Promise<GitProvider[]>;
  findByAppInstallation(
    organizationId: OrganizationId,
    appInstallationId: number,
  ): Promise<GitProvider | null>;
  list(organizationId?: OrganizationId): Promise<GitProvider[]>;
  update(
    id: string,
    gitProvider: Partial<Omit<GitProvider, 'id'>>,
  ): Promise<GitProvider>;
}
