import { IOrganizationGateway } from '../../domain/repositories/IOrganizationGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { Organization } from '@packmind/types';

export class OrganizationGateway implements IOrganizationGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  async getOrganization(): Promise<Organization> {
    const { organizationId } = this.httpClient.getAuthContext();
    const organizations = await this.httpClient.request<Organization[]>(
      '/api/v0/organizations',
    );
    const org = organizations.find((o) => o.id === organizationId);
    if (!org) {
      throw new Error(`Organization ${organizationId} not found`);
    }
    return org;
  }
}
