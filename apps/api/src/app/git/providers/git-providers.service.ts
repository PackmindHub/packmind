import { Injectable } from '@nestjs/common';
import {
  GitProvider,
  GitRepo,
  GitProviderId,
  GitRepoId,
  GitHexa,
  AddGitProviderCommand,
} from '@packmind/git';
import { AccountsHexa } from '@packmind/accounts';
import { OrganizationId, UserId } from '@packmind/accounts';

@Injectable()
export class GitProvidersService {
  constructor(
    private readonly gitHexa: GitHexa,
    private readonly accountsHexa: AccountsHexa,
  ) {
    this.gitHexa.setUserProvider(this.accountsHexa.getUserProvider());
    this.gitHexa.setOrganizationProvider(
      this.accountsHexa.getOrganizationProvider(),
    );
  }

  async addGitProvider(
    userId: UserId,
    organizationId: OrganizationId,
    gitProvider: Omit<GitProvider, 'id'>,
  ): Promise<GitProvider> {
    const command: AddGitProviderCommand = {
      userId: String(userId),
      organizationId: String(organizationId),
      gitProvider,
    };

    return this.gitHexa.addGitProvider(command);
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

    return await this.gitHexa.addGitRepo(command);
  }

  async listProviders(organizationId: OrganizationId): Promise<GitProvider[]> {
    return this.gitHexa.listProviders(organizationId);
  }

  async getRepositories(organizationId: OrganizationId): Promise<GitRepo[]> {
    return this.gitHexa.getOrganizationRepositories(organizationId);
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
    return this.gitHexa.listAvailableRepos(gitProviderId);
  }

  async checkBranchExists(
    organizationId: OrganizationId,
    gitProviderId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    return this.gitHexa.checkBranchExists(gitProviderId, owner, repo, branch);
  }

  async updateGitProvider(
    id: GitProviderId,
    gitProvider: Partial<Omit<GitProvider, 'id'>>,
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<GitProvider> {
    return this.gitHexa.updateGitProvider(
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
    return this.gitHexa.deleteGitProvider(id, userId, organizationId);
  }

  async removeRepositoryFromProvider(
    providerId: GitProviderId,
    userId: UserId,
    organizationId: OrganizationId,
    repositoryId: GitRepoId,
  ): Promise<void> {
    return this.gitHexa.deleteGitRepo(
      repositoryId,
      userId,
      organizationId,
      providerId,
    );
  }
}
