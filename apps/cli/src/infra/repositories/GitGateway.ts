import { ListProvidersResponse } from '@packmind/types';
import { IGitGateway } from '../../domain/repositories/IGitGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';

export class GitGateway implements IGitGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  async listProviders(): Promise<ListProvidersResponse> {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<ListProvidersResponse>(
      `/api/v0/organizations/${organizationId}/git/providers`,
    );
  }
}
