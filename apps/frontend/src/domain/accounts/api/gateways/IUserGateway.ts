import {
  OrganizationId,
  UserId,
  IListOrganizationUsersUseCase,
  IListOrganizationUserStatusesUseCase,
  IChangeUserRoleUseCase,
  NewGateway,
} from '@packmind/types';
import { UserOrganizationRole } from '@packmind/types';

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
  getUsersInMyOrganization: NewGateway<IListOrganizationUsersUseCase>;
  getUserStatuses: NewGateway<IListOrganizationUserStatusesUseCase>;
  changeUserRole: NewGateway<IChangeUserRoleUseCase>;
}
