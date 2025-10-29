import { Organization } from '@packmind/accounts/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IOrganizationGateway } from './IOrganizationGateway';
import {
  UserOrganizationRole,
  OrganizationOnboardingStatus,
} from '@packmind/shared';

export class OrganizationGatewayApi
  extends PackmindGateway
  implements IOrganizationGateway
{
  constructor() {
    super('/organizations');
  }

  async createOrganization(organization: {
    name: string;
  }): Promise<Organization> {
    return this._api.post<Organization>(this._endpoint, organization);
  }

  async getByName(name: string): Promise<Organization> {
    return this._api.get<Organization>(
      `${this._endpoint}/by-name/${encodeURIComponent(name)}`,
    );
  }

  async getBySlug(slug: string): Promise<Organization> {
    return this._api.get<Organization>(`${this._endpoint}/slug/${slug}`);
  }

  async getUserOrganizations(): Promise<Organization[]> {
    return this._api.get<Organization[]>(this._endpoint);
  }

  async inviteUsers(
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
  }> {
    return this._api.post(
      `${this._endpoint}/${encodeURIComponent(orgId)}/invite`,
      { emails, role },
    );
  }

  async excludeUser(orgId: string, userId: string): Promise<void> {
    return this._api.delete(
      `${this._endpoint}/${encodeURIComponent(orgId)}/user/${encodeURIComponent(userId)}`,
    );
  }

  async getOnboardingStatus(
    orgId: string,
  ): Promise<OrganizationOnboardingStatus> {
    return this._api.get<OrganizationOnboardingStatus>(
      `${this._endpoint}/${encodeURIComponent(orgId)}/onboarding-status`,
    );
  }
}
