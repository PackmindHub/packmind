import {
  Organization,
  NewGateway,
  NewPackmindCommandBody,
} from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IOrganizationGateway } from './IOrganizationGateway';
import {
  OrganizationOnboardingStatus,
  ICreateInvitationsUseCase,
  CreateInvitationsCommand,
  CreateInvitationsResponse,
  IRemoveUserFromOrganizationUseCase,
  RemoveUserFromOrganizationCommand,
  RemoveUserFromOrganizationResponse,
} from '@packmind/types';

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

  async getUserOrganizations(): Promise<Organization[]> {
    return this._api.get<Organization[]>(this._endpoint);
  }

  inviteUsers: NewGateway<ICreateInvitationsUseCase> = async ({
    organizationId,
    emails,
    role,
  }: NewPackmindCommandBody<CreateInvitationsCommand>) => {
    return this._api.post<CreateInvitationsResponse>(
      `${this._endpoint}/${encodeURIComponent(organizationId)}/users/invite`,
      { emails, role },
    );
  };

  removeUser: NewGateway<IRemoveUserFromOrganizationUseCase> = async ({
    organizationId,
    targetUserId,
  }: NewPackmindCommandBody<RemoveUserFromOrganizationCommand>) => {
    return this._api.delete<RemoveUserFromOrganizationResponse>(
      `${this._endpoint}/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(targetUserId)}`,
    );
  };

  async getOnboardingStatus(
    orgId: string,
  ): Promise<OrganizationOnboardingStatus> {
    return this._api.get<OrganizationOnboardingStatus>(
      `${this._endpoint}/${encodeURIComponent(orgId)}/onboarding-status`,
    );
  }
}
