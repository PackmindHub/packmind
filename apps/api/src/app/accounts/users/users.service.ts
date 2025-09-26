import { Injectable } from '@nestjs/common';
import {
  AccountsHexa,
  ListUsersResponse,
  OrganizationId,
  User,
  UserId,
} from '@packmind/accounts';

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

  async getOrganizationById(organizationId: OrganizationId) {
    return this.accountsHexa.getOrganizationById({ organizationId });
  }
}
