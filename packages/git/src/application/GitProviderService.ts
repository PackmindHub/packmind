import { IGitProviderRepository } from '../domain/repositories/IGitProviderRepository';
import { IGitProviderFactory } from '../domain/repositories/IGitProviderFactory';
import { IGitRepoFactory } from '../domain/repositories/IGitRepoFactory';
import { CheckAuthResult } from '../domain/repositories/IGitProvider';
import {
  GitProvider,
  GitProviderId,
  createGitProviderId,
  createGitRepoId,
} from '@packmind/types';
import { GitRepo } from '@packmind/types';
import { OrganizationId, UserId } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export class GitProviderService {
  constructor(
    private readonly gitProviderRepository: IGitProviderRepository,
    private readonly gitProviderFactory: IGitProviderFactory,
    private readonly gitRepoFactory: IGitRepoFactory,
  ) {}

  async addGitProvider(
    gitProvider: Omit<GitProvider, 'id'>,
  ): Promise<GitProvider> {
    const gitProviderWithId = {
      ...gitProvider,
      id: createGitProviderId(uuidv4()),
    };
    return this.gitProviderRepository.add(gitProviderWithId);
  }

  async findGitProviderById(id: GitProviderId): Promise<GitProvider | null> {
    return this.gitProviderRepository.findById(id);
  }

  async findGitProvidersByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<GitProvider[]> {
    return this.gitProviderRepository.findByOrganizationId(organizationId);
  }

  async findGitProviderByAppInstallation(
    organizationId: OrganizationId,
    appInstallationId: number,
  ): Promise<GitProvider | null> {
    return this.gitProviderRepository.findByAppInstallation(
      organizationId,
      appInstallationId,
    );
  }

  async updateGitProvider(
    id: GitProviderId,
    gitProvider: Partial<Omit<GitProvider, 'id'>>,
  ): Promise<GitProvider> {
    return this.gitProviderRepository.update(id, gitProvider);
  }

  async deleteGitProvider(id: GitProviderId, userId: UserId): Promise<void> {
    return this.gitProviderRepository.deleteById(id, userId);
  }

  async getAvailableRepos(gitProviderId: GitProviderId): Promise<
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
    // NOTE: This method contains business logic and should be moved to a use case
    // This is kept temporarily for backward compatibility
    // Find the GitProvider linked in the database
    const gitProvider =
      await this.gitProviderRepository.findById(gitProviderId);

    if (!gitProvider) {
      throw new Error('Git provider not found');
    }

    // Create an instance of IGitProvider using the factory (token validation delegated)
    const providerInstance =
      await this.gitProviderFactory.createGitProvider(gitProvider);
    return providerInstance.listAvailableRepositories(); // Always filters for write-only repositories
  }

  async checkProviderAuth(
    gitProviderId: GitProviderId,
  ): Promise<CheckAuthResult> {
    const gitProvider =
      await this.gitProviderRepository.findById(gitProviderId);

    if (!gitProvider) {
      throw new Error('Git provider not found');
    }

    const providerInstance =
      await this.gitProviderFactory.createGitProvider(gitProvider);
    return providerInstance.checkAuth();
  }

  async checkBranchExists(
    gitProviderId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    // NOTE: This method contains business logic and should be moved to a use case
    // This is kept temporarily for backward compatibility
    // Find the GitProvider linked in the database
    const gitProvider =
      await this.gitProviderRepository.findById(gitProviderId);

    if (!gitProvider) {
      throw new Error('Git provider not found');
    }

    // Create an instance of IGitProvider using the factory (token validation delegated)
    const providerInstance =
      await this.gitProviderFactory.createGitProvider(gitProvider);
    return providerInstance.checkBranchExists(owner, repo, branch);
  }

  async createBranchFromBase(
    gitProviderId: GitProviderId,
    owner: string,
    repo: string,
    baseBranch: string,
    targetBranch: string,
  ): Promise<void> {
    // Resolve provider + token, then build an IGitRepo bound to the BASE
    // branch so the underlying client knows where to fork from. The factory
    // only consumes owner/repo/branch from the GitRepo shape, so the synthetic
    // id/providerId/type fields are inert here.
    const gitProvider =
      await this.gitProviderRepository.findById(gitProviderId);

    if (!gitProvider) {
      throw new Error('Git provider not found');
    }

    if (gitProvider.authMethod !== 'app' && !gitProvider.token) {
      throw new Error('Git provider token not configured');
    }

    const syntheticGitRepo: GitRepo = {
      id: createGitRepoId(uuidv4()),
      owner,
      repo,
      branch: baseBranch,
      providerId: gitProviderId,
      type: 'standard',
    };

    const gitRepoInstance = await this.gitRepoFactory.createGitRepo(
      syntheticGitRepo,
      gitProvider,
    );

    await gitRepoInstance.createBranchFromBase(targetBranch);
  }

  async openOrUpdatePullRequest(
    gitRepo: GitRepo,
    command: {
      head: string;
      title: string;
      body?: string;
    },
  ): Promise<{ url: string; number: number; wasCreated: boolean }> {
    // Resolve provider + token, then build an IGitRepo bound to the BASE
    // branch (the repo's configured `branch` field is the merge target).
    const gitProvider = await this.gitProviderRepository.findById(
      gitRepo.providerId,
    );

    if (!gitProvider) {
      throw new Error('Git provider not found');
    }

    if (gitProvider.authMethod !== 'app' && !gitProvider.token) {
      throw new Error('Git provider token not configured');
    }

    const gitRepoInstance = await this.gitRepoFactory.createGitRepo(
      gitRepo,
      gitProvider,
    );

    return gitRepoInstance.openOrUpdatePullRequest(command);
  }

  async listAvailableTargets(
    gitRepo: GitRepo,
    path?: string,
  ): Promise<string[]> {
    // Find the specific git provider for this repository
    const gitProvider = await this.gitProviderRepository.findById(
      gitRepo.providerId,
    );

    if (!gitProvider) {
      throw new Error('Git provider not found for this repository');
    }

    // Create an instance of IGitRepo using the factory (token validation delegated)
    const gitRepoInstance = await this.gitRepoFactory.createGitRepo(
      gitRepo,
      gitProvider,
    );
    return gitRepoInstance.listDirectoriesOnRepo(
      gitRepo.repo,
      gitRepo.owner,
      gitRepo.branch,
      path,
    );
  }
}
