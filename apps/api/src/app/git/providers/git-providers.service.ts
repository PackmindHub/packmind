import { Injectable } from '@nestjs/common';
import {
  GitProvider,
  GitRepo,
  GitProviderId,
  GitRepoId,
  GitHexa,
} from '@packmind/git';
import { OrganizationId, UserId } from '@packmind/accounts';

@Injectable()
export class GitProvidersService {
  constructor(private readonly gitHexa: GitHexa) {}

  async addGitProvider(
    organizationId: OrganizationId,
    gitProvider: Omit<GitProvider, 'id'>,
  ): Promise<GitProvider> {
    return this.gitHexa.addGitProvider(gitProvider, organizationId);
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
  ): Promise<GitProvider> {
    return this.gitHexa.updateGitProvider(id, gitProvider);
  }

  async deleteGitProvider(id: GitProviderId, userId: UserId): Promise<void> {
    return this.gitHexa.deleteGitProvider(id, userId);
  }

  async removeRepositoryFromProvider(
    providerId: GitProviderId,
    userId: UserId,
    repositoryId: GitRepoId,
  ): Promise<void> {
    return this.gitHexa.deleteGitRepo(repositoryId, userId, providerId);
  }
}
