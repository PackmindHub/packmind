import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IGitProviderGateway } from './IGitProviderGateway';
import {
  CheckDirectoryExistenceResult,
  GitProvider,
  GitProviderId,
  GitRepoId,
  IListProvidersUseCase,
  ListProvidersResponse,
  NewGateway,
  OrganizationId,
} from '@packmind/types';
import {
  GitProviderUI,
  GitRepoUI,
  CreateGitProviderForm,
  AddRepositoryForm,
  AvailableRepository,
} from '../../types/GitProviderTypes';

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
      `${this._endpoint}/${organizationId}/git/providers`,
      gitProvider,
    );
  }

  async updateGitProvider(
    organizationId: OrganizationId,
    id: GitProviderId,
    data: Partial<CreateGitProviderForm>,
  ): Promise<GitProviderUI> {
    const gitProvider: Partial<Omit<GitProvider, 'id'>> = {
      source: data.source,
      url: data.url,
      token: data.token,
    };
    return await this._api.put<GitProviderUI>(
      `${this._endpoint}/${organizationId}/git/providers/${id}`,
      gitProvider,
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

  async getAvailableRepositories(
    organizationId: OrganizationId,
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
    >(
      `${this._endpoint}/${organizationId}/git/providers/${providerId}/available-repos`,
    );
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

  async checkBranchExists(
    organizationId: OrganizationId,
    providerId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    try {
      const response = await this._api.get<{ exists: boolean }>(
        `${this._endpoint}/${organizationId}/git/providers/${providerId}/repos/${owner}/${repo}/branches/${branch}/exists`,
      );
      return response.exists;
    } catch (error) {
      console.error('Failed to check if branch exists:', error);
      return false;
    }
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
