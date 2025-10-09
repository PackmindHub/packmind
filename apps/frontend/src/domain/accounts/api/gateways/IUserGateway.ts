import {
  OrganizationId,
  UserId,
  ListOrganizationUserStatusesResponse,
  IListOrganizationUsersUseCase,
} from '@packmind/accounts/types';
import {
  ChangeUserRoleResponse,
  UserOrganizationRole,
  Gateway,
} from '@packmind/shared';

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
  getUsersInMyOrganization: Gateway<IListOrganizationUsersUseCase>;
  getUserStatuses(): Promise<ListOrganizationUserStatusesResponse>;
  changeUserRole(
    targetUserId: UserId,
    newRole: UserOrganizationRole,
  ): Promise<ChangeUserRoleResponse>;
}
