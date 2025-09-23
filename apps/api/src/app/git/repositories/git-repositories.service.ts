import { Injectable } from '@nestjs/common';
import { GitHexa, GitProviderId, GitRepo, GitRepoId } from '@packmind/git';
import { OrganizationId, UserId } from '@packmind/accounts';
import { DeploymentsHexa } from '@packmind/deployments';
import {
  IDeploymentPort,
  CheckDirectoryExistenceResult,
} from '@packmind/shared';

@Injectable()
export class GitRepositoriesService {
  private readonly deploymentAdapter: IDeploymentPort;

  constructor(
    private readonly gitHexa: GitHexa,
    private readonly deploymentHexa: DeploymentsHexa,
  ) {
    this.deploymentAdapter = this.deploymentHexa.getDeploymentsUseCases();
    this.gitHexa.setDeploymentsAdapter(this.deploymentAdapter);
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

  async getAvailableRemoteDirectories(
    userId: UserId,
    organizationId: OrganizationId,
    repositoryId: GitRepoId,
    path?: string,
  ): Promise<string[]> {
    // First, get the GitRepo by ID to ensure it exists and get all its details
    const gitRepo = await this.gitHexa.getRepositoryById(repositoryId);

    if (!gitRepo) {
      throw new Error(`Repository with ID ${repositoryId} not found`);
    }

    // Create the command for the use case
    const command = {
      userId,
      organizationId,
      gitRepo,
      path,
    };

    return await this.gitHexa.getAvailableRemoteDirectories(command);
  }

  async checkDirectoryExistence(
    userId: UserId,
    organizationId: OrganizationId,
    repositoryId: GitRepoId,
    directoryPath: string,
    branch: string,
  ): Promise<CheckDirectoryExistenceResult> {
    // Create the command for the use case
    const command = {
      userId,
      organizationId,
      gitRepoId: repositoryId,
      directoryPath,
      branch,
    };

    return await this.gitHexa.checkDirectoryExistence(command);
  }
}
