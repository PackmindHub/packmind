import { DataSource } from 'typeorm';
import { User, Organization } from '@packmind/types';
import { UserSchema } from '../src/infra/schemas/UserSchema';

import { userFactory } from './userFactory';
import { OrganizationSchema } from '../src/infra/schemas/index';
import { organizationFactory } from './organizationFactory';
import { invitationFactory } from './invitationFactory';

export { organizationFactory } from './organizationFactory';

export { userFactory };
export { invitationFactory };

export const createUser = async (
  dataSource: DataSource,
  user?: Partial<User>,
): Promise<User> => {
  const repository = dataSource.getRepository(UserSchema);
  return repository.save(userFactory(user));
};

export const createOrganization = async (
  dataSource: DataSource,
  organization?: Partial<Organization>,
): Promise<Organization> => {
  const repository = dataSource.getRepository(OrganizationSchema);
  return repository.save(organizationFactory(organization));
};
