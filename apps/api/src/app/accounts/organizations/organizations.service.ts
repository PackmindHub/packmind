import { Injectable } from '@nestjs/common';
import {
  AccountsHexa,
  Organization,
  OrganizationId,
  RemoveUserFromOrganizationCommand,
  RemoveUserFromOrganizationResponse,
} from '@packmind/accounts';
import { UserId, UserOrganizationRole } from '@packmind/types';

@Injectable()
export class OrganizationsService {
  constructor(private readonly accountsHexa: AccountsHexa) {}

  async removeUserFromOrganization(
    command: RemoveUserFromOrganizationCommand,
  ): Promise<RemoveUserFromOrganizationResponse> {
    return this.accountsHexa.removeUserFromOrganization(command);
  }

  async getOrganizationById(id: OrganizationId): Promise<Organization | null> {
    return this.accountsHexa.getOrganizationById({ organizationId: id });
  }

  async getOrganizationByName(name: string): Promise<Organization | null> {
    return this.accountsHexa.getOrganizationByName({ name });
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    return this.accountsHexa.getOrganizationBySlug({ slug });
  }

  async getUserOrganizations(userId: UserId): Promise<Organization[]> {
    const result = await this.accountsHexa.listUserOrganizations({ userId });
    return result.organizations;
  }

  async createOrganization(
    userId: UserId,
    name: string,
  ): Promise<Organization> {
    return this.accountsHexa.createOrganization({ userId, name });
  }

  async inviteUsers(
    organizationId: OrganizationId,
    userId: string,
    emails: string[],
    role: UserOrganizationRole,
  ) {
    // Note: role is currently unused in the invitation flow
    return this.accountsHexa.createInvitations({
      organizationId,
      userId,
      emails,
      role,
    });
  }
}
