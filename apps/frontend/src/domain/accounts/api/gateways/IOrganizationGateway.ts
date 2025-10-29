import { Organization } from '@packmind/accounts/types';
import {
  UserOrganizationRole,
  OrganizationOnboardingStatus,
} from '@packmind/shared';

export interface IOrganizationGateway {
  createOrganization(organization: { name: string }): Promise<Organization>;
  getByName(name: string): Promise<Organization>;
  getBySlug(slug: string): Promise<Organization>;
  getUserOrganizations(): Promise<Organization[]>;
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
  excludeUser(orgId: string, userId: string): Promise<void>;
  getOnboardingStatus(orgId: string): Promise<OrganizationOnboardingStatus>;
}
