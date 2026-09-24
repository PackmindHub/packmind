import { IGitProviderRepository } from '../domain/repositories/IGitProviderRepository';
import {
  GitProviderCredentials,
  IGitProviderFactory,
} from '../domain/repositories/IGitProviderFactory';
import { ResolvedGitRepoService } from './services/ResolvedGitRepoService';
import { CheckAuthResult } from '../domain/repositories/IGitProvider';
import {
  GitProvider,
  GitProviderId,
  GitProviderNotFoundError,
  GitProviderTokenNotConfiguredError,
  ListAvailableReposResponse,
  createGitProviderId,
  createGitRepoId,
} from '@packmind/types';
import { GitBranchComparison, GitRepo } from '@packmind/types';
import { OrganizationId, UserId } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export class GitProviderService {
  constructor(
    private readonly gitProviderRepository: IGitProviderRepository,
    private readonly gitProviderFactory: IGitProviderFactory,
    private readonly resolvedGitRepoService: ResolvedGitRepoService,
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

  async getAvailableRepos(
    gitProviderId: GitProviderId,
    page = 1,
  ): Promise<ListAvailableReposResponse> {
    const gitProvider =
      await this.gitProviderRepository.findById(gitProviderId);

    if (!gitProvider) {
      throw new GitProviderNotFoundError(gitProviderId);
    }

    const providerInstance =
      await this.gitProviderFactory.createGitProvider(gitProvider);
    const { repositories, totalPages, lastLoadedPage, partial } =
      await providerInstance.listAvailableRepositories(page);
    return {
      currentPage: page,
      availablePages: totalPages,
      lastLoadedPage,
      repositories,
      partial,
    };
  }

  /**
   * Probe a GitProvider shape that is not necessarily persisted, so a candidate
   * credential can be verified before it replaces the stored one. Read-only: it
   * never touches the repository.
   */
  async checkAuthForProviderConfig(
    gitProvider: GitProviderCredentials,
  ): Promise<CheckAuthResult> {
    const providerInstance =
      await this.gitProviderFactory.createGitProvider(gitProvider);
    return providerInstance.checkAuth();
  }

  async checkProviderAuth(
    gitProviderId: GitProviderId,
  ): Promise<CheckAuthResult> {
    const gitProvider =
      await this.gitProviderRepository.findById(gitProviderId);

    if (!gitProvider) {
      throw new GitProviderNotFoundError(gitProviderId);
    }

    // Probing with no token would report `unauthorized`, which blames the
    // provider for what is a storage problem on our side.
    if (gitProvider.tokenUnreadable) {
      return { ok: false, reason: 'token_unreadable' };
    }

    return this.checkAuthForProviderConfig(gitProvider);
  }

  async checkBranchExists(
    gitProviderId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    const gitProvider =
      await this.gitProviderRepository.findById(gitProviderId);

    if (!gitProvider) {
      throw new GitProviderNotFoundError(gitProviderId);
    }

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
    // The IGitRepo must be bound to the base branch so the client knows where
    // to fork from. The factory only reads owner/repo/branch, which is why the
    // synthetic GitRepo below can carry throwaway id/type fields.
    const gitProvider =
      await this.resolvedGitRepoService.getProvider(gitProviderId);

    if (!gitProvider) {
      throw new GitProviderNotFoundError(gitProviderId);
    }

    if (gitProvider.authMethod !== 'app' && !gitProvider.token) {
      throw new GitProviderTokenNotConfiguredError(gitProviderId);
    }

    const syntheticGitRepo: GitRepo = {
      id: createGitRepoId(uuidv4()),
      owner,
      repo,
      branch: baseBranch,
      providerId: gitProviderId,
      type: 'standard',
      isTracked: false,
      trackingRemovedAt: null,
    };

    const gitRepoInstance =
      await this.resolvedGitRepoService.resolve(syntheticGitRepo);

    await gitRepoInstance.createBranchFromBase(targetBranch);
  }

  async deleteBranch(
    gitProviderId: GitProviderId,
    owner: string,
    repo: string,
    targetBranch: string,
  ): Promise<void> {
    const gitProvider =
      await this.resolvedGitRepoService.getProvider(gitProviderId);

    if (!gitProvider) {
      throw new GitProviderNotFoundError(gitProviderId);
    }

    if (gitProvider.authMethod !== 'app' && !gitProvider.token) {
      throw new GitProviderTokenNotConfiguredError(gitProviderId);
    }

    const syntheticGitRepo: GitRepo = {
      id: createGitRepoId(uuidv4()),
      owner,
      repo,
      branch: targetBranch,
      providerId: gitProviderId,
      type: 'standard',
      isTracked: false,
      trackingRemovedAt: null,
    };

    const gitRepoInstance =
      await this.resolvedGitRepoService.resolve(syntheticGitRepo);

    await gitRepoInstance.deleteBranch(targetBranch);
  }

  async openOrUpdatePullRequest(
    gitRepo: GitRepo,
    command: {
      head: string;
      title: string;
      body?: string;
    },
  ): Promise<{ url: string; number: number; wasCreated: boolean }> {
    // `gitRepo.branch` is the merge target, so resolving against it binds the
    // IGitRepo to the PR's base.
    const gitProvider = await this.resolvedGitRepoService.getProvider(
      gitRepo.providerId,
    );

    if (!gitProvider) {
      throw new GitProviderNotFoundError(gitRepo.providerId);
    }

    if (gitProvider.authMethod !== 'app' && !gitProvider.token) {
      throw new GitProviderTokenNotConfiguredError(gitRepo.providerId);
    }

    const gitRepoInstance = await this.resolvedGitRepoService.resolve(gitRepo);

    return gitRepoInstance.openOrUpdatePullRequest(command);
  }

  async findOpenSyncPullRequest(
    gitRepo: GitRepo,
    head: string,
  ): Promise<{ url: string; number: number } | null> {
    const gitProvider = await this.resolvedGitRepoService.getProvider(
      gitRepo.providerId,
    );

    if (!gitProvider) {
      throw new GitProviderNotFoundError(gitRepo.providerId);
    }

    if (gitProvider.authMethod !== 'app' && !gitProvider.token) {
      throw new GitProviderTokenNotConfiguredError(gitRepo.providerId);
    }

    const gitRepoInstance = await this.resolvedGitRepoService.resolve(gitRepo);

    return gitRepoInstance.findOpenPullRequest(head);
  }

  async compareBranches(
    gitRepo: GitRepo,
    base: string,
    head: string,
  ): Promise<GitBranchComparison> {
    const gitProvider = await this.resolvedGitRepoService.getProvider(
      gitRepo.providerId,
    );

    if (!gitProvider) {
      throw new GitProviderNotFoundError(gitRepo.providerId);
    }

    if (gitProvider.authMethod !== 'app' && !gitProvider.token) {
      throw new GitProviderTokenNotConfiguredError(gitRepo.providerId);
    }

    const gitRepoInstance = await this.resolvedGitRepoService.resolve(gitRepo);

    return gitRepoInstance.compareBranches(base, head);
  }

  async checkMarketplaceRepoExists(gitRepo: GitRepo): Promise<{
    exists: boolean;
    reason?: 'auth_failed' | 'repo_not_found' | 'network_transient';
  }> {
    const gitProvider = await this.resolvedGitRepoService.getProvider(
      gitRepo.providerId,
    );

    if (
      !gitProvider ||
      (gitProvider.authMethod !== 'app' && !gitProvider.token)
    ) {
      return { exists: false, reason: 'auth_failed' };
    }

    const gitRepoInstance = await this.resolvedGitRepoService.resolve(gitRepo);

    return gitRepoInstance.checkRepositoryExists();
  }

  async listAvailableTargets(
    gitRepo: GitRepo,
    path?: string,
  ): Promise<string[]> {
    const gitProvider = await this.resolvedGitRepoService.getProvider(
      gitRepo.providerId,
    );

    if (!gitProvider) {
      throw new GitProviderNotFoundError(gitRepo.providerId);
    }

    const gitRepoInstance = await this.resolvedGitRepoService.resolve(gitRepo);
    return gitRepoInstance.listDirectoriesOnRepo(
      gitRepo.repo,
      gitRepo.owner,
      gitRepo.branch,
      path,
    );
  }
}
