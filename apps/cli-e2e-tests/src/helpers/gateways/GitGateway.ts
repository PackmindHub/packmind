import { ListProvidersResponse } from '@packmind/types';
import { IGitGateway } from '../IPackmindGateway';
import { PackmindHttpClient } from './PackmindHttpClient';

export class GitGateway implements IGitGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  listProviders = async (): Promise<ListProvidersResponse> => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request<ListProvidersResponse>(
      `/api/v0/organizations/${organizationId}/git/providers`,
    );
  };
}
