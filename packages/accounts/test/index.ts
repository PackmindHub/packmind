import { DataSource } from 'typeorm';
import { User } from '../src/domain/entities/User';
import { UserSchema } from '../src/infra/schemas/UserSchema';

import { userFactory } from './userFactory';
import { Organization } from '../src/domain/entities/Organization';
import { OrganizationSchema } from '../src/infra/schemas/index';
import { organizationFactory } from './organizationFactory';

export { organizationFactory } from './organizationFactory';

export { userFactory };

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
