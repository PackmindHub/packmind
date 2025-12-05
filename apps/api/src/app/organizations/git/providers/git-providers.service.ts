import { Injectable } from '@nestjs/common';
import { AccountsHexa } from '@packmind/accounts';
import {
  AddGitProviderCommand,
  GitProvider,
  GitProviderId,
  GitRepo,
  GitRepoId,
  IGitPort,
  ListProvidersCommand,
  ListProvidersResponse,
  OrganizationId,
  UserId,
} from '@packmind/types';
import { InjectGitAdapter } from '../../../shared/HexaInjection';

@Injectable()
export class GitProvidersService {
  constructor(
    @InjectGitAdapter() private readonly gitAdapter: IGitPort,
    private readonly accountsHexa: AccountsHexa,
  ) {}

  async addGitProvider(
    userId: UserId,
    organizationId: OrganizationId,
    gitProvider: Omit<GitProvider, 'id'>,
  ): Promise<GitProvider> {
    const command: AddGitProviderCommand = {
      userId: String(userId),
      organizationId: String(organizationId),
      gitProvider,
      // Always false from API endpoints - only internal use cases can bypass token check
      allowTokenlessProvider: false,
    };

    return this.gitAdapter.addGitProvider(command);
  }

  async addRepositoryToProvider(
    userId: UserId,
    organizationId: OrganizationId,
    gitProviderId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<GitRepo> {
    const command = {
      userId,
      organizationId,
      gitProviderId,
      owner,
      repo,
      branch,
    };

    return await this.gitAdapter.addGitRepo(command);
  }

  async listProviders(
    command: ListProvidersCommand,
  ): Promise<ListProvidersResponse> {
    return this.gitAdapter.listProviders(command);
  }

  async getRepositories(organizationId: OrganizationId): Promise<GitRepo[]> {
    return this.gitAdapter.getOrganizationRepositories(organizationId);
  }

  async listAvailableRepos(gitProviderId: GitProviderId): Promise<
    {
      name: string;
      owner: string;
      description?: string;
      private: boolean;
      defaultBranch: string;
      language?: string;
      stars: number;
    }[]
  > {
    return this.gitAdapter.listAvailableRepos(gitProviderId);
  }

  async checkBranchExists(
    organizationId: OrganizationId,
    gitProviderId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    return this.gitAdapter.checkBranchExists(
      gitProviderId,
      owner,
      repo,
      branch,
    );
  }

  async updateGitProvider(
    id: GitProviderId,
    gitProvider: Partial<Omit<GitProvider, 'id'>>,
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<GitProvider> {
    return this.gitAdapter.updateGitProvider(
      id,
      gitProvider,
      userId,
      organizationId,
    );
  }

  async deleteGitProvider(
    id: GitProviderId,
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<void> {
    return this.gitAdapter.deleteGitProvider(id, userId, organizationId);
  }

  async removeRepositoryFromProvider(
    providerId: GitProviderId,
    userId: UserId,
    organizationId: OrganizationId,
    repositoryId: GitRepoId,
  ): Promise<void> {
    return this.gitAdapter.deleteGitRepo(
      repositoryId,
      userId,
      organizationId,
      providerId,
    );
  }
}
