import { Organization } from '../entities/Organization';
import { IRepository } from '@packmind/shared';

export interface IOrganizationRepository extends IRepository<Organization> {
  findBySlug(slug: string): Promise<Organization | null>;
  list(): Promise<Organization[]>;
}
