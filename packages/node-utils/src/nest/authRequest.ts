import { Request } from 'express';
import {
  ClientSource,
  OrganizationId,
  UserId,
  UserOrganizationRole,
} from '@packmind/types';

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
  /**
   * The source of the request, determined by the authentication method:
   * - 'ui': Authenticated via session cookie
   * - 'cli': Authenticated via API Key
   */
  clientSource: ClientSource;
}
