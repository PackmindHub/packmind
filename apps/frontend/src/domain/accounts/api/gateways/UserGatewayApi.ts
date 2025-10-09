import {
  ListOrganizationUserStatusesResponse,
  ListOrganizationUsersResponse,
  UserId,
} from '@packmind/accounts/types';
import { ChangeUserRoleResponse, UserOrganizationRole } from '@packmind/shared';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IUserGateway } from './IUserGateway';

export class UserGatewayApi extends PackmindGateway implements IUserGateway {
  constructor() {
    super('/users');
  }

  async getUsersInMyOrganization(): Promise<ListOrganizationUsersResponse> {
    return this._api.get<ListOrganizationUsersResponse>(
      `${this._endpoint}/organization`,
    );
  }

  async getUserStatuses(): Promise<ListOrganizationUserStatusesResponse> {
    return this._api.get<ListOrganizationUserStatusesResponse>(
      `${this._endpoint}/statuses`,
    );
  }

  async changeUserRole(
    targetUserId: UserId,
    newRole: UserOrganizationRole,
  ): Promise<ChangeUserRoleResponse> {
    return this._api.patch<ChangeUserRoleResponse>(
      `${this._endpoint}/${targetUserId}/role`,
      { newRole },
    );
  }
}
