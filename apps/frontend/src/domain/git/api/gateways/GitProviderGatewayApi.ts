import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IGitProviderGateway } from './IGitProviderGateway';
import {
  CheckDirectoryExistenceResult,
  CheckProviderAuthResponse,
  GitProviderId,
  GitProviderWithoutToken,
  GitRepoId,
  IListAvailableReposUseCase,
  IListProvidersUseCase,
  ListAvailableReposResponse,
  ListProvidersResponse,
  NewGateway,
  OrganizationId,
} from '@packmind/types';
import {
  GitProviderUI,
  GitRepoUI,
  CreateGitProviderForm,
  AddRepositoryForm,
} from '../../types/GitProviderTypes';
import { GitHubAppManifest } from '../../types/GitHubAppManifest';

// Serializes the defined, non-empty params into a query string (leading '?'),
// or an empty string when none apply.
const buildQuery = (params: Record<string, string | undefined>): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const serialized = search.toString();
  return serialized ? `?${serialized}` : '';
};

export class GitProviderGatewayApi
  extends PackmindGateway
  implements IGitProviderGateway
{
  constructor() {
    super('/organizations');
  }

  getGitProviders: NewGateway<IListProvidersUseCase> = async ({
    organizationId,
  }) => {
    return await this._api.get<ListProvidersResponse>(
      `${this._endpoint}/${organizationId}/git/providers`,
    );
  };

  async getGitProviderById(
    organizationId: OrganizationId,
    id: GitProviderId,
  ): Promise<GitProviderUI> {
    const response = await this._api.get<ListProvidersResponse>(
      `${this._endpoint}/${organizationId}/git/providers`,
    );
    const provider = response.providers.find((p) => p.id === id);
    if (!provider) {
      throw new Error(`Git provider with id ${id} not found`);
    }
    return provider as GitProviderUI;
  }

  async getGithubAppInstallUrl(
    organizationId: OrganizationId,
    gitProviderId?: GitProviderId,
    displayName?: string,
  ): Promise<{ installUrl: string; state: string }> {
    const query = buildQuery({ gitProviderId, displayName });
    return await this._api.get<{ installUrl: string; state: string }>(
      `${this._endpoint}/${organizationId}/git/providers/github/app/install-url${query}`,
    );
  }

  async getGithubAppManifest(
    organizationId: OrganizationId,
    githubOrg?: string,
    displayName?: string,
  ): Promise<{
    manifest: GitHubAppManifest;
    state: string;
    manifestPostUrl: string;
  }> {
    const query = buildQuery({ githubOrg, displayName });
    return await this._api.get<{
      manifest: GitHubAppManifest;
      state: string;
      manifestPostUrl: string;
    }>(
      `${this._endpoint}/${organizationId}/git/providers/github/app/manifest${query}`,
    );
  }

  async getGithubAppStatus(organizationId: OrganizationId): Promise<{
    hasApp: boolean;
    appSlug?: string;
    revokedAt?: Date | null;
    linkedProviderCount: number;
  }> {
    return await this._api.get<{
      hasApp: boolean;
      appSlug?: string;
      revokedAt?: Date | null;
      linkedProviderCount: number;
    }>(`${this._endpoint}/${organizationId}/git/providers/github/app/status`);
  }

  async revokeGithubApp(organizationId: OrganizationId): Promise<void> {
    await this._api.delete(
      `${this._endpoint}/${organizationId}/git/providers/github/app`,
    );
  }

  async submitGithubAppCallback(
    organizationId: OrganizationId,
    body: { installationId: number; state: string },
  ): Promise<GitProviderWithoutToken> {
    return await this._api.post<GitProviderWithoutToken>(
      `${this._endpoint}/${organizationId}/git/providers/github/app/callback`,
      body,
    );
  }

  async submitGithubAppManifestCallback(
    organizationId: OrganizationId,
    body: { code: string; state: string },
  ): Promise<{ installUrl: string }> {
    return await this._api.post<{ installUrl: string }>(
      `${this._endpoint}/${organizationId}/git/providers/github/app/manifest-callback`,
      body,
    );
  }

  async createGitProvider(
    organizationId: OrganizationId,
    data: CreateGitProviderForm,
  ): Promise<GitProviderUI> {
    const body = {
      source: data.source,
      organizationId,
      url: data.url,
      authMethod: data.authMethod ?? 'token',
      displayName: data.displayName ?? '',
      ...(data.authMethod === 'app'
        ? {
            appInstallationId: data.appInstallationId,
          }
        : { token: data.token }),
    };
    return await this._api.put<GitProviderUI>(
      `${this._endpoint}/${organizationId}/git/providers`,
      body,
    );
  }

  async updateGitProvider(
    organizationId: OrganizationId,
    id: GitProviderId,
    data: Partial<CreateGitProviderForm>,
  ): Promise<GitProviderUI> {
    // Only forward fields the caller actually set. Defaulting authMethod here
    // would make a partial update (e.g. renaming) look like a switch to token
    // auth on the backend, which then rejects the request because no token was
    // supplied.
    const body: Record<string, unknown> = {};
    if (data.source !== undefined) body.source = data.source;
    if (data.url !== undefined) body.url = data.url;
    if (data.displayName !== undefined) body.displayName = data.displayName;
    if (data.authMethod !== undefined) {
      body.authMethod = data.authMethod;
      if (data.authMethod === 'app') {
        body.appInstallationId = data.appInstallationId;
      } else {
        body.token = data.token;
      }
    }
    return await this._api.put<GitProviderUI>(
      `${this._endpoint}/${organizationId}/git/providers/${id}`,
      body,
    );
  }

  async deleteGitProvider(
    organizationId: OrganizationId,
    id: GitProviderId,
  ): Promise<void> {
    await this._api.delete(
      `${this._endpoint}/${organizationId}/git/providers/${id}`,
    );
  }

  async getRepositoriesByProvider(
    organizationId: OrganizationId,
    providerId: GitProviderId,
  ): Promise<GitRepoUI[]> {
    return await this._api.get<GitRepoUI[]>(
      `${this._endpoint}/${organizationId}/git/repositories/provider/${providerId}`,
    );
  }

  getAvailableRepositories: NewGateway<IListAvailableReposUseCase> = async ({
    organizationId,
    gitProviderId,
    page,
  }) => {
    const query = page ? `?page=${page}` : '';
    return await this._api.get<ListAvailableReposResponse>(
      `${this._endpoint}/${organizationId}/git/providers/${gitProviderId}/available-repos${query}`,
    );
  };

  async addRepositoryToProvider(
    organizationId: OrganizationId,
    providerId: GitProviderId,
    data: AddRepositoryForm,
  ): Promise<GitRepoUI> {
    const payload = {
      owner: data.owner,
      repo: data.name,
      branch: data.branch,
    };

    return this._api.post<GitRepoUI>(
      `${this._endpoint}/${organizationId}/git/providers/${providerId}/repositories`,
      payload,
    );
  }

  async removeRepositoryFromProvider(
    organizationId: OrganizationId,
    providerId: GitProviderId,
    repoId: GitRepoId,
  ): Promise<void> {
    return this._api.delete<void>(
      `${this._endpoint}/${organizationId}/git/providers/${providerId}/repositories/${repoId}`,
    );
  }

  async checkProviderAuth(
    organizationId: OrganizationId,
    providerId: GitProviderId,
  ): Promise<CheckProviderAuthResponse> {
    return this._api.get<CheckProviderAuthResponse>(
      `${this._endpoint}/${organizationId}/git/providers/${providerId}/check-auth`,
    );
  }

  async checkBranchExists(
    organizationId: OrganizationId,
    providerId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    // Query parameters rather than path segments: a branch name may contain
    // slashes, which no amount of percent-encoding survives in a path once
    // nginx has normalized the URI. Failures propagate — "we could not ask"
    // must not be presented as "the branch is gone".
    const query = new URLSearchParams({ owner, repo, branch });
    const response = await this._api.get<{ exists: boolean }>(
      `${this._endpoint}/${organizationId}/git/providers/${providerId}/branch-exists?${query}`,
    );
    return response.exists;
  }

  async getAvailableRemoteDirectories(
    organizationId: OrganizationId,
    repositoryId: GitRepoId,
    path?: string,
  ): Promise<string[]> {
    const axiosInstance = this._api.getAxiosInstance();
    const params = path ? { path } : {};
    const response = await axiosInstance.get<string[]>(
      `${this._endpoint}/${organizationId}/git/repositories/${repositoryId}/available-remote-directories`,
      {
        params,
        timeout: 35000,
      },
    );
    return response.data;
  }

  async checkDirectoryExistence(
    organizationId: OrganizationId,
    repositoryId: GitRepoId,
    directoryPath: string,
    branch: string,
  ): Promise<CheckDirectoryExistenceResult> {
    const response = await this._api.post<CheckDirectoryExistenceResult>(
      `${this._endpoint}/${organizationId}/git/repositories/${repositoryId}/check-directory-existence`,
      {
        directoryPath,
        branch,
      },
    );
    return response;
  }
}
