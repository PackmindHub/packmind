import {
  User,
  OrganizationId,
  UserId,
  ListOrganizationUserStatusesResponse,
} from '@packmind/accounts/types';
import { ChangeUserRoleResponse, UserOrganizationRole } from '@packmind/shared';

export interface UserMeResponse {
  message: string;
  authenticated: boolean;
  user?: {
    id: UserId;
    email: string;
    organizationId: OrganizationId;
  };
}

export interface IUserGateway {
  getUsersInMyOrganization(): Promise<User[]>;
  getUserStatuses(): Promise<ListOrganizationUserStatusesResponse>;
  changeUserRole(
    targetUserId: UserId,
    newRole: UserOrganizationRole,
  ): Promise<ChangeUserRoleResponse>;
}
