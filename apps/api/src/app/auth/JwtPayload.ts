import { OrganizationId, UserId } from '@packmind/accounts';

export interface JwtPayload {
  user: {
    name: string;
    userId: UserId;
  };
  organization: {
    id: OrganizationId;
    name: string;
    slug: string;
  };
  iat: number;
  exp: number;
}
