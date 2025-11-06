import {
  OrganizationId,
  UserId,
  ListOrganizationUserStatusesResponse,
  IListOrganizationUsersUseCase,
} from '@packmind/types';
import {
  ChangeUserRoleResponse,
  UserOrganizationRole,
  Gateway,
} from '@packmind/types';

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
