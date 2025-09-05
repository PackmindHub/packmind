import { Branded, brandedIdFactory } from '../brandedTypes';
import { Organization, OrganizationId } from './Organization';

export type UserId = Branded<'UserId'>;
export const createUserId = brandedIdFactory<UserId>();

export type User = {
  id: UserId;
  username: string;
  passwordHash: string;
  organizationId: OrganizationId; // Single organization ID
  organization?: Organization; // Optional relation for TypeORM
};

export type CreateUser = Omit<User, 'id'>;
