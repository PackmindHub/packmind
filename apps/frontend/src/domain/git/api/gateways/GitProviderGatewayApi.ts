import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IGitProviderGateway } from './IGitProviderGateway';
import { GitProvider, GitProviderId, GitRepoId } from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import {
  GitProviderUI,
  GitRepoUI,
  CreateGitProviderForm,
  AddRepositoryForm,
  AvailableRepository,
} from '../../types/GitProviderTypes';
import { CheckDirectoryExistenceResult } from '@packmind/types';

export class GitProviderGatewayApi
  extends PackmindGateway
  implements IGitProviderGateway
{
  constructor() {
    super('/git');
  }

  async getGitProviders(
    organizationId: OrganizationId,
  ): Promise<GitProviderUI[]> {
    return await this._api.get<GitProviderUI[]>(`${this._endpoint}/providers`);
  }

  async getGitProviderById(id: GitProviderId): Promise<GitProviderUI> {
    // This endpoint doesn't exist yet in the backend
    // For now, get all providers and find by ID as a workaround
    const providers = await this._api.get<GitProviderUI[]>(
      `${this._endpoint}/providers`,
    );
    const provider = providers.find((p) => p.id === id);
    if (!provider) {
      throw new Error(`Git provider with id ${id} not found`);
    }
    return provider;
  }

  async createGitProvider(
    organizationId: OrganizationId,
    data: CreateGitProviderForm,
  ): Promise<GitProviderUI> {
    const gitProvider: Omit<GitProvider, 'id'> = {
      source: data.source,
      organizationId,
      url: data.url,
      token: data.token,
    };
    return await this._api.put<GitProviderUI>(
      `${this._endpoint}/providers`,
      gitProvider,
    );
  }

  async updateGitProvider(
    id: GitProviderId,
    data: Partial<CreateGitProviderForm>,
  ): Promise<GitProviderUI> {
    const gitProvider: Partial<Omit<GitProvider, 'id'>> = {
      source: data.source,
      url: data.url,
      token: data.token,
    };
    return await this._api.put<GitProviderUI>(
      `${this._endpoint}/providers/${id}`,
      gitProvider,
    );
  }

  async deleteGitProvider(id: GitProviderId): Promise<void> {
    await this._api.delete(`${this._endpoint}/providers/${id}`);
  }

  async getRepositoriesByProvider(
    providerId: GitProviderId,
  ): Promise<GitRepoUI[]> {
    return await this._api.get<GitRepoUI[]>(
      `${this._endpoint}/repositories/provider/${providerId}`,
    );
  }

  async getAvailableRepositories(
    providerId: GitProviderId,
  ): Promise<AvailableRepository[]> {
    const repos = await this._api.get<
      {
        name: string;
        owner: string;
        description?: string;
        private: boolean;
        defaultBranch: string;
        language?: string;
        stars: number;
      }[]
    >(`${this._endpoint}/providers/${providerId}/available-repos`);
    return repos.map((repo) => ({
      name: repo.name,
      owner: repo.owner,
      fullName: `${repo.owner}/${repo.name}`,
      description: repo.description,
      private: repo.private,
      defaultBranch: repo.defaultBranch,
      language: repo.language,
      stars: repo.stars,
    }));
  }

  async addRepositoryToProvider(
    providerId: GitProviderId,
    data: AddRepositoryForm,
  ): Promise<GitRepoUI> {
    const payload = {
      owner: data.owner,
      repo: data.name,
      branch: data.branch,
    };

    return this._api.post<GitRepoUI>(
      `${this._endpoint}/providers/${providerId}/repositories`,
      payload,
    );
  }

  async removeRepositoryFromProvider(
    providerId: GitProviderId,
    repoId: GitRepoId,
  ): Promise<void> {
    return this._api.delete<void>(
      `${this._endpoint}/providers/${providerId}/repositories/${repoId}`,
    );
  }

  async checkBranchExists(
    providerId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    try {
      const response = await this._api.get<{ exists: boolean }>(
        `${this._endpoint}/providers/${providerId}/repos/${owner}/${repo}/branches/${branch}/exists`,
      );
      return response.exists;
    } catch (error) {
      console.error('Failed to check if branch exists:', error);
      // Return false for any error (branch doesn't exist, network issues, etc.)
      return false;
    }
  }

  async getAvailableRemoteDirectories(
    repositoryId: GitRepoId,
    path?: string,
  ): Promise<string[]> {
    // Use a longer timeout for this specific request since it can take up to 30 seconds
    const axiosInstance = this._api.getAxiosInstance();
    const params = path ? { path } : {};
    const response = await axiosInstance.get<string[]>(
      `${this._endpoint}/repositories/${repositoryId}/available-remote-directories`,
      {
        params,
        timeout: 35000, // 35 seconds timeout to accommodate the 30-second processing time
      },
    );
    return response.data;
  }

  async checkDirectoryExistence(
    repositoryId: GitRepoId,
    directoryPath: string,
    branch: string,
  ): Promise<CheckDirectoryExistenceResult> {
    const response = await this._api.post<CheckDirectoryExistenceResult>(
      `${this._endpoint}/repositories/${repositoryId}/check-directory-existence`,
      {
        directoryPath,
        branch,
      },
    );
    return response;
  }
}
