import { Injectable } from '@nestjs/common';
import {
  CheckDirectoryExistenceResult,
  GitProviderId,
  GitRepo,
  GitRepoId,
  IDeploymentPort,
  IGitPort,
  OrganizationId,
  UserId,
} from '@packmind/types';
import {
  InjectGitAdapter,
  InjectDeploymentAdapter,
} from '../../../shared/HexaInjection';

@Injectable()
export class GitRepositoriesService {
  constructor(
    @InjectGitAdapter() private readonly gitAdapter: IGitPort,
    @InjectDeploymentAdapter()
    private readonly deploymentAdapter: IDeploymentPort,
  ) {}

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

  async getRepositoriesByOrganization(
    organizationId: OrganizationId,
  ): Promise<GitRepo[]> {
    return this.gitAdapter.getOrganizationRepositories(organizationId);
  }

  async getRepositoryById(repositoryId: GitRepoId): Promise<GitRepo | null> {
    return this.gitAdapter.getRepositoryById(repositoryId);
  }

  async getRepositoriesByProvider(
    gitProviderId: GitProviderId,
  ): Promise<GitRepo[]> {
    return this.gitAdapter.listRepos(gitProviderId);
  }

  async getAvailableRemoteDirectories(
    userId: UserId,
    organizationId: OrganizationId,
    repositoryId: GitRepoId,
    path?: string,
  ): Promise<string[]> {
    const gitRepo = await this.gitAdapter.getRepositoryById(repositoryId);

    if (!gitRepo) {
      throw new Error(`Repository with ID ${repositoryId} not found`);
    }

    const command = {
      userId,
      organizationId,
      gitRepo,
      path,
    };

    return await this.gitAdapter.getAvailableRemoteDirectories(command);
  }

  async checkDirectoryExistence(
    userId: UserId,
    organizationId: OrganizationId,
    repositoryId: GitRepoId,
    directoryPath: string,
    branch: string,
  ): Promise<CheckDirectoryExistenceResult> {
    const command = {
      userId,
      organizationId,
      gitRepoId: repositoryId,
      directoryPath,
      branch,
    };

    return await this.gitAdapter.checkDirectoryExistence(command);
  }
}
