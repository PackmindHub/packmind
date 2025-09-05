import { Request } from 'express';
import { OrganizationId, UserId } from '@packmind/accounts';

export interface AuthenticatedRequest extends Request {
  user: {
    name: string;
    userId: UserId;
  };
  organization: {
    id: OrganizationId;
    name: string;
    slug: string;
  };
}
