import { Request } from 'express';
import {
  OrganizationId,
  UserId,
  UserOrganizationRole,
} from '@packmind/accounts';

export interface AuthenticatedRequest extends Request {
  user: {
    name: string;
    userId: UserId;
  };
  /**
   * @deprecated organization and its ID should be available through the API parameters.
   */
  organization: {
    id: OrganizationId;
    name: string;
    slug: string;
    role: UserOrganizationRole;
  };
}
