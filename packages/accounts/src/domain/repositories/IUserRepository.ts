import { User } from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { IRepository } from '@packmind/types';

export interface IUserRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findByEmailCaseInsensitive(email: string): Promise<User | null>;
  listByOrganization(organizationId: OrganizationId): Promise<User[]>;
}
