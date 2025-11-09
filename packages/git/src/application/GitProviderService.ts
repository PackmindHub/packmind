import { IGitProviderRepository } from '../domain/repositories/IGitProviderRepository';
import { IGitProviderFactory } from '../domain/repositories/IGitProviderFactory';
import { IGitRepoFactory } from '../domain/repositories/IGitRepoFactory';
import {
  GitProvider,
  GitProviderId,
  createGitProviderId,
} from '@packmind/types';
import { GitRepo } from '@packmind/types';
import { OrganizationId, UserId } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { v4 as uuidv4 } from 'uuid';

export class GitProviderService {
  constructor(
    private readonly gitProviderRepository: IGitProviderRepository,
    private readonly gitProviderFactory: IGitProviderFactory,
    private readonly gitRepoFactory: IGitRepoFactory,
    private readonly logger: PackmindLogger,
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

    // Get the token from the provider
    const token = gitProvider.token;

    if (!token) {
      throw new Error('Git provider token not configured');
    }

    // Create an instance of IGitProvider using the factory
    const providerInstance =
      this.gitProviderFactory.createGitProvider(gitProvider);
    return providerInstance.listAvailableRepositories(); // Always filters for write-only repositories
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

    // Get the token from the provider
    const token = gitProvider.token;

    if (!token) {
      throw new Error('Git provider token not configured');
    }

    // Create an instance of IGitProvider using the factory
    const providerInstance =
      this.gitProviderFactory.createGitProvider(gitProvider);
    return providerInstance.checkBranchExists(owner, repo, branch);
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

    if (!gitProvider.token) {
      throw new Error('Git provider token not configured');
    }

    // Create an instance of IGitRepo using the factory
    const gitRepoInstance = this.gitRepoFactory.createGitRepo(
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
