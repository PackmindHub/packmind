import { Factory } from '@packmind/shared/test';
import {
  User,
  createUserId,
  UserOrganizationMembership,
} from '../src/domain/entities/User';
import { createOrganizationId } from '../src/domain/entities/Organization';
import { v4 as uuidv4 } from 'uuid';

export const userFactory: Factory<User> = (user?: Partial<User>) => {
  const id = createUserId(uuidv4());
  const organizationMembership: UserOrganizationMembership = {
    userId: id,
    organizationId: createOrganizationId(uuidv4()),
    role: 'admin',
  };

  return {
    id,
    email: 'testuser@packmind.com',
    passwordHash: 'hashedpassword123',
    active: true,
    memberships: [organizationMembership],
    ...user,
  };
};
