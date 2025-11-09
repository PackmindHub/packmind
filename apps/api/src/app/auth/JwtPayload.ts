import { OrganizationId, UserId, UserOrganizationRole } from '@packmind/types';

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
  } | null;
  iat: number;
  exp: number;
}
