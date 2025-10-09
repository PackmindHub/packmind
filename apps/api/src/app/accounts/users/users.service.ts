import { Injectable } from '@nestjs/common';
import {
  AccountsHexa,
  ListOrganizationUserStatusesResponse,
  ListOrganizationUsersResponse,
  OrganizationId,
  User,
  UserId,
} from '@packmind/accounts';
import {
  ChangeUserRoleCommand,
  ChangeUserRoleResponse,
  UserOrganizationRole,
} from '@packmind/shared';

@Injectable()
export class UsersService {
  constructor(private readonly accountsHexa: AccountsHexa) {}

  async getUserById(id: UserId): Promise<User | null> {
    return this.accountsHexa.getUserById({ userId: id });
  }

  async getUserStatuses(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<ListOrganizationUserStatusesResponse> {
    return this.accountsHexa.listOrganizationUserStatuses({
      userId,
      organizationId,
    });
  }

  async getOrganizationUsers(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<ListOrganizationUsersResponse> {
    return this.accountsHexa.listOrganizationUsers({
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
    return this.accountsHexa.changeUserRole(command);
  }
}
