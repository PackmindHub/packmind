import { Injectable, Inject } from '@nestjs/common';
import { IAccountsPort } from '@packmind/types';
import {
  ListOrganizationUserStatusesCommand,
  ListOrganizationUserStatusesResponse,
  ListOrganizationUsersCommand,
  ListOrganizationUsersResponse,
  ChangeUserRoleCommand,
  ChangeUserRoleResponse,
} from '@packmind/accounts';
import { ACCOUNTS_ADAPTER_TOKEN } from '../../shared/HexaRegistryModule';

@Injectable()
export class UsersService {
  constructor(
    @Inject(ACCOUNTS_ADAPTER_TOKEN)
    private readonly accountsAdapter: IAccountsPort,
  ) {}

  async getUserStatuses(
    command: ListOrganizationUserStatusesCommand,
  ): Promise<ListOrganizationUserStatusesResponse> {
    return this.accountsAdapter.listOrganizationUserStatuses(command);
  }

  async getOrganizationUsers(
    command: ListOrganizationUsersCommand,
  ): Promise<ListOrganizationUsersResponse> {
    return this.accountsAdapter.listOrganizationUsers(command);
  }

  async changeUserRole(
    command: ChangeUserRoleCommand,
  ): Promise<ChangeUserRoleResponse> {
    return this.accountsAdapter.changeUserRole(command);
  }
}
