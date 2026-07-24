import {
  GitProvider,
  GitProviderId,
  GitRepo,
  ListAvailableReposResponse,
  ListProvidersResponse,
} from '@packmind/types';
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

  async listReposByProvider(gitProviderId: GitProviderId): Promise<GitRepo[]> {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<GitRepo[]>(
      `/api/v0/organizations/${organizationId}/git/repositories/provider/${gitProviderId}`,
    );
  }

  async listAvailableRepos(
    gitProviderId: GitProviderId,
    page?: number,
  ): Promise<ListAvailableReposResponse> {
    const { organizationId } = this.httpClient.getAuthContext();
    const query =
      page !== undefined
        ? `?${new URLSearchParams({ page: String(page) }).toString()}`
        : '';
    return this.httpClient.request<ListAvailableReposResponse>(
      `/api/v0/organizations/${organizationId}/git/providers/${gitProviderId}/available-repos${query}`,
    );
  }
}
