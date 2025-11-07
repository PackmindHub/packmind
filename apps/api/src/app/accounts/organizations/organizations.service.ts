import { Injectable } from '@nestjs/common';
import {
  Organization,
  OrganizationId,
  RemoveUserFromOrganizationCommand,
  RemoveUserFromOrganizationResponse,
} from '@packmind/accounts';
import { UserId, UserOrganizationRole, IAccountsPort } from '@packmind/types';
import { InjectAccountsAdapter } from '../../shared/HexaInjection';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectAccountsAdapter() private readonly accountsAdapter: IAccountsPort,
  ) {}

  async removeUserFromOrganization(
    command: RemoveUserFromOrganizationCommand,
  ): Promise<RemoveUserFromOrganizationResponse> {
    return this.accountsAdapter.removeUserFromOrganization(command);
  }

  async getOrganizationById(id: OrganizationId): Promise<Organization | null> {
    return this.accountsAdapter.getOrganizationById({ organizationId: id });
  }

  async getOrganizationByName(name: string): Promise<Organization | null> {
    return this.accountsAdapter.getOrganizationByName({ name });
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    return this.accountsAdapter.getOrganizationBySlug({ slug });
  }

  async getUserOrganizations(userId: UserId): Promise<Organization[]> {
    const result = await this.accountsAdapter.listUserOrganizations({
      userId,
    });
    return result.organizations;
  }

  async createOrganization(
    userId: UserId,
    name: string,
  ): Promise<Organization> {
    return this.accountsAdapter.createOrganization({ userId, name });
  }

  async inviteUsers(
    organizationId: OrganizationId,
    userId: string,
    emails: string[],
    role: UserOrganizationRole,
  ) {
    // Note: role is currently unused in the invitation flow
    return this.accountsAdapter.createInvitations({
      organizationId,
      userId,
      emails,
      role,
    });
  }
}
