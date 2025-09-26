import {
  OrganizationId,
  UserId,
  UserOrganizationMembership,
  UserOrganizationRole,
} from '@packmind/accounts';

export interface JwtPayload {
  user: {
    name: string;
    userId: UserId;
  };
  organization: {
    id: OrganizationId;
    name: string;
    slug: string;
    role: UserOrganizationRole;
  };
  memberships?: Array<
    Pick<UserOrganizationMembership, 'organizationId' | 'role'>
  >;
  iat: number;
  exp: number;
}
