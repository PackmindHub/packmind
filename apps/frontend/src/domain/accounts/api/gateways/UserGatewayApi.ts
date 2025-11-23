import {
  NewGateway,
  IListOrganizationUsersUseCase,
  IListOrganizationUserStatusesUseCase,
  IChangeUserRoleUseCase,
  NewPackmindCommandBody,
  ListOrganizationUsersCommand,
  ListOrganizationUserStatusesCommand,
  ChangeUserRoleCommand,
  ListOrganizationUsersResponse,
  ListOrganizationUserStatusesResponse,
  ChangeUserRoleResponse,
} from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IUserGateway } from './IUserGateway';

export class UserGatewayApi extends PackmindGateway implements IUserGateway {
  constructor() {
    super('/organizations');
  }

  getUsersInMyOrganization: NewGateway<IListOrganizationUsersUseCase> = async ({
    organizationId,
  }: NewPackmindCommandBody<ListOrganizationUsersCommand>) => {
    return this._api.get<ListOrganizationUsersResponse>(
      `${this._endpoint}/${organizationId}/users`,
    );
  };

  getUserStatuses: NewGateway<IListOrganizationUserStatusesUseCase> = async ({
    organizationId,
  }: NewPackmindCommandBody<ListOrganizationUserStatusesCommand>) => {
    return this._api.get<ListOrganizationUserStatusesResponse>(
      `${this._endpoint}/${organizationId}/users/statuses`,
    );
  };

  changeUserRole: NewGateway<IChangeUserRoleUseCase> = async ({
    organizationId,
    targetUserId,
    newRole,
  }: NewPackmindCommandBody<ChangeUserRoleCommand>) => {
    return this._api.patch<ChangeUserRoleResponse>(
      `${this._endpoint}/${organizationId}/users/${targetUserId}/role`,
      { newRole },
    );
  };
}
