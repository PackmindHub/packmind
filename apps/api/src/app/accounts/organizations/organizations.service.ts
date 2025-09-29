import { Injectable } from '@nestjs/common';
import { AccountsHexa, Organization, OrganizationId } from '@packmind/accounts';
import { UserOrganizationRole } from '@packmind/shared';

@Injectable()
export class OrganizationsService {
  constructor(private readonly accountsHexa: AccountsHexa) {}

  async getOrganizations(): Promise<Organization[]> {
    return this.accountsHexa.listOrganizations({});
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

  async createOrganization(name: string): Promise<Organization> {
    return this.accountsHexa.createOrganization({ name });
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
