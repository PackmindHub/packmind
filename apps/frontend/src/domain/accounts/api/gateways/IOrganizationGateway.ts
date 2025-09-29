import { Organization } from '@packmind/accounts/types';
import { UserOrganizationRole } from '@packmind/shared';

export interface IOrganizationGateway {
  createOrganization(organization: { name: string }): Promise<Organization>;
  getByName(name: string): Promise<Organization>;
  getBySlug(slug: string): Promise<Organization>;
  inviteUsers(
    orgId: string,
    emails: string[],
    role: UserOrganizationRole,
  ): Promise<{
    created: { email: string; userId: string }[];
    organizationInvitations: {
      email: string;
      userId: string;
      organizationId: string;
      role: string;
    }[];
    skipped: { email: string; reason: string }[];
  }>;
}
