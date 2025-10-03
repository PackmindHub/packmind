import { Injectable } from '@nestjs/common';
import {
  AccountsHexa,
  ListOrganizationUserStatusesResponse,
  ListUsersResponse,
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

  async getUsers(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<ListUsersResponse> {
    return this.accountsHexa.listUsers({ userId, organizationId });
  }

  async getUserById(id: UserId): Promise<User | null> {
    return this.accountsHexa.getUserById({ userId: id });
  }

  async getUsersByOrganizationId(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<ListUsersResponse['users']> {
    const { users } = await this.getUsers(userId, organizationId);
    return users;
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
