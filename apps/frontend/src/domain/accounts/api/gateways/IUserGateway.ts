import {
  User,
  OrganizationId,
  UserId,
  ListOrganizationUserStatusesResponse,
} from '@packmind/accounts/types';

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
}
