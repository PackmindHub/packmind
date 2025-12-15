import { Branded, brandedIdFactory } from '../brandedTypes';
import { Organization, OrganizationId } from './Organization';

export type UserId = Branded<'UserId'>;
export const createUserId = brandedIdFactory<UserId>();

export type UserOrganizationRole = 'admin' | 'member';

export type UserOrganizationMembership = {
  userId: UserId;
  organizationId: OrganizationId;
  role: UserOrganizationRole;
  user?: User;
  organization?: Organization;
};

export type User = {
  id: UserId;
  email: string;
  passwordHash: string | null;
  active: boolean;
  memberships: UserOrganizationMembership[];
  trial: boolean;
};

export type SanitizedUser = Omit<User, 'passwordHash' | 'memberships'>;

export type CreateUser = Omit<User, 'id' | 'memberships'> & {
  memberships?: UserOrganizationMembership[];
};
