import { Factory } from '@packmind/shared/test';
import { User, createUserId } from '../src/domain/entities/User';
import { createOrganizationId } from '../src/domain/entities/Organization';
import { v4 as uuidv4 } from 'uuid';

export const userFactory: Factory<User> = (user?: Partial<User>) => {
  return {
    id: createUserId(uuidv4()),
    username: 'testuser',
    passwordHash: 'hashedpassword123',
    organizationId: createOrganizationId(uuidv4()),
    ...user,
  };
};
