import { Injectable } from '@nestjs/common';
import {
  OrganizationId,
  User,
  UserId,
  UserOrganizationRole,
  IAccountsPort,
} from '@packmind/types';
import {
  ListOrganizationUserStatusesResponse,
  ListOrganizationUsersResponse,
  ChangeUserRoleCommand,
  ChangeUserRoleResponse,
} from '@packmind/accounts';
import { InjectAccountsAdapter } from '../../shared/HexaInjection';

@Injectable()
export class UsersService {
  constructor(
    @InjectAccountsAdapter() private readonly accountsAdapter: IAccountsPort,
  ) {}

  async getUserById(id: UserId): Promise<User | null> {
    return this.accountsAdapter.getUserById({ userId: id });
  }

  async getUserStatuses(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<ListOrganizationUserStatusesResponse> {
    return this.accountsAdapter.listOrganizationUserStatuses({
      userId,
      organizationId,
    });
  }

  async getOrganizationUsers(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<ListOrganizationUsersResponse> {
    return this.accountsAdapter.listOrganizationUsers({
      userId,
      organizationId,
    });
  }

  async changeUserRole(
    userId: UserId,
    organizationId: OrganizationId,
    targetUserId: UserId,
    newRole: UserOrganizationRole,
  ): Promise<ChangeUserRoleResponse> {
    const command: ChangeUserRoleCommand = {
      userId,
      organizationId,
      targetUserId,
      newRole,
    };
    return this.accountsAdapter.changeUserRole(command);
  }
}
