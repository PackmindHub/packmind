import { Injectable } from '@nestjs/common';
import { AccountsHexa, OrganizationId, User, UserId } from '@packmind/accounts';

@Injectable()
export class UsersService {
  constructor(private readonly accountsHexa: AccountsHexa) {}

  async getUsers(): Promise<User[]> {
    return this.accountsHexa.listUsers({});
  }

  async getUserById(id: UserId): Promise<User | null> {
    return this.accountsHexa.getUserById({ userId: id });
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return this.accountsHexa.getUserByUsername({ username });
  }

  async doesUsernameExist(username: string): Promise<boolean> {
    const user = await this.accountsHexa.getUserByUsername({ username });
    return user !== null;
  }

  async getUsersByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<User[]> {
    const allUsers = await this.accountsHexa.listUsers({});
    return allUsers.filter((user) => user.organizationId === organizationId);
  }

  async getOrganizationById(organizationId: OrganizationId) {
    return this.accountsHexa.getOrganizationById({ organizationId });
  }
}
