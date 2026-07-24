import { GitProvider, ListProvidersResponse } from '@packmind/types';
import {
  AddGitConnectionInput,
  IGitGateway,
} from '../../domain/repositories/IGitGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';

export class GitGateway implements IGitGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  async listProviders(): Promise<ListProvidersResponse> {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<ListProvidersResponse>(
      `/api/v0/organizations/${organizationId}/git/providers`,
    );
  }

  async addProvider(input: AddGitConnectionInput): Promise<GitProvider> {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<GitProvider>(
      `/api/v0/organizations/${organizationId}/git/providers`,
      {
        method: 'PUT',
        body: {
          source: input.source,
          displayName: input.displayName,
          token: input.token,
          url: input.url,
          authMethod: 'token',
        },
      },
    );
  }
}
