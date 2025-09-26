import { Branded, brandedIdFactory } from '@packmind/shared';
import { Organization, OrganizationId } from './Organization';

export type UserId = Branded<'UserId'>;
export const createUserId = brandedIdFactory<UserId>();

export type UserOrganizationRole = 'admin';

export type UserOrganizationMembership = {
  userId: UserId;
  organizationId: OrganizationId;
  role: UserOrganizationRole;
  organization?: Organization;
  user?: User;
};

export type User = {
  id: UserId;
  email: string;
  passwordHash: string | null;
  active: boolean;
  memberships: UserOrganizationMembership[];
};

export type CreateUser = Omit<User, 'id' | 'memberships'> & {
  memberships?: UserOrganizationMembership[];
};
