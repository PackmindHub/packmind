import { Injectable } from '@nestjs/common';
import {
  CheckDirectoryExistenceResult,
  ClientSource,
  GetTrackedRepositoryResponse,
  GitProviderId,
  GitRepo,
  GitRepoId,
  IDeploymentPort,
  IGitPort,
  OrganizationId,
  SetTrackedRepositoryResponse,
  UpdateTrackedBranchResponse,
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

  async getTrackedRepository(
    userId: UserId,
    organizationId: OrganizationId,
    owner: string,
    repo: string,
  ): Promise<GetTrackedRepositoryResponse> {
    return this.gitAdapter.getTrackedRepository({
      userId,
      organizationId,
      owner,
      repo,
    });
  }

  async setTrackedRepository(
    userId: UserId,
    organizationId: OrganizationId,
    owner: string,
    repo: string,
    branch: string,
    origin: 'init' | 'track',
    providerVendor?: string,
    gitRemoteUrl?: string,
  ): Promise<SetTrackedRepositoryResponse> {
    return this.gitAdapter.setTrackedRepository({
      userId,
      organizationId,
      owner,
      repo,
      branch,
      origin,
      providerVendor,
      gitRemoteUrl,
    });
  }

  async updateTrackedBranch(
    userId: UserId,
    organizationId: OrganizationId,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<UpdateTrackedBranchResponse> {
    return this.gitAdapter.updateTrackedBranch({
      userId,
      organizationId,
      owner,
      repo,
      branch,
    });
  }

  async addRepositoryToProvider(
    userId: UserId,
    organizationId: OrganizationId,
    gitProviderId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
    source: ClientSource,
  ): Promise<GitRepo> {
    const command = {
      userId,
      organizationId,
      gitProviderId,
      owner,
      repo,
      branch,
      // Always false from API endpoints - only internal use cases can bypass token check
      allowTokenlessProvider: false,
      source,
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
