import { Injectable } from '@nestjs/common';
import { GitHexa, GitProviderId, GitRepo, GitRepoId } from '@packmind/git';
import { OrganizationId, UserId } from '@packmind/accounts';

@Injectable()
export class GitRepositoriesService {
  constructor(private readonly gitHexa: GitHexa) {}

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

  async getRepositoriesByOrganization(
    organizationId: OrganizationId,
  ): Promise<GitRepo[]> {
    return this.gitHexa.getOrganizationRepositories(organizationId);
  }

  async getRepositoryById(repositoryId: GitRepoId): Promise<GitRepo | null> {
    return this.gitHexa.getRepositoryById(repositoryId);
  }

  async getRepositoriesByProvider(
    gitProviderId: GitProviderId,
  ): Promise<GitRepo[]> {
    return this.gitHexa.listRepos(gitProviderId);
  }
}
