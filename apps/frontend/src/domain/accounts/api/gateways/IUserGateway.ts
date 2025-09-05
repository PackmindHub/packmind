import { User, OrganizationId, UserId } from '@packmind/accounts/types';

export interface UserMeResponse {
  message: string;
  authenticated: boolean;
  user?: {
    id: UserId;
    username: string;
    organizationId: OrganizationId;
  };
}

export interface UsernameExistsResponse {
  exists: boolean;
}

export interface IUserGateway {
  getUsersInMyOrganization(): Promise<User[]>;
  doesUsernameExist(username: string): Promise<UsernameExistsResponse>;
}
