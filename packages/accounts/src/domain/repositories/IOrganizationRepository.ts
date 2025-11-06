import { Organization } from '@packmind/types';
import { IRepository } from '@packmind/types';

export interface IOrganizationRepository extends IRepository<Organization> {
  findBySlug(slug: string): Promise<Organization | null>;
  list(): Promise<Organization[]>;
}
