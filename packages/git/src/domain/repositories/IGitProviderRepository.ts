import { GitProvider } from '../entities/GitProvider';
import { OrganizationId } from '@packmind/types';
import { IRepository } from '@packmind/types';

export interface IGitProviderRepository extends IRepository<GitProvider> {
  findByOrganizationId(organizationId: OrganizationId): Promise<GitProvider[]>;
  list(organizationId?: OrganizationId): Promise<GitProvider[]>;
  update(
    id: string,
    gitProvider: Partial<Omit<GitProvider, 'id'>>,
  ): Promise<GitProvider>;
}
