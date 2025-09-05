import { GitProvider } from '../entities/GitProvider';
import { OrganizationId } from '@packmind/accounts/types';
import { IRepository } from '@packmind/shared';

export interface IGitProviderRepository extends IRepository<GitProvider> {
  findByOrganizationId(organizationId: OrganizationId): Promise<GitProvider[]>;
  list(organizationId?: OrganizationId): Promise<GitProvider[]>;
  update(
    id: string,
    gitProvider: Partial<Omit<GitProvider, 'id'>>,
  ): Promise<GitProvider>;
}
