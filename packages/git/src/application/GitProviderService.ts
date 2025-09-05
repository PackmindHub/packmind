import { IGitProviderRepository } from '../domain/repositories/IGitProviderRepository';
import {
  GitProviderVendors,
  GitProvider,
  GitProviderId,
  createGitProviderId,
} from '../domain/entities/GitProvider';
import { GithubProvider } from '../infra/repositories/github/GithubProvider';
import { GitlabProvider } from '../infra/repositories/gitlab/GitlabProvider';
import { OrganizationId, UserId } from '@packmind/accounts';
import { PackmindLogger } from '@packmind/shared';
import { v4 as uuidv4 } from 'uuid';

export class GitProviderService {
  constructor(
    private readonly gitProviderRepository: IGitProviderRepository,
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

    // Create an instance of IGitProvider based on the provider type
    switch (gitProvider.source) {
      case GitProviderVendors.github: {
        const githubProvider = new GithubProvider(token, this.logger);
        return githubProvider.listAvailableRepositories(); // Always filters for write-only repositories
      }
      case GitProviderVendors.gitlab: {
        const gitlabProvider = new GitlabProvider(
          token,
          this.logger,
          gitProvider.url || undefined,
        );
        return gitlabProvider.listAvailableRepositories(); // Always filters for write-only repositories
      }

      default:
        throw new Error(
          `Unsupported git provider source: ${gitProvider.source}`,
        );
    }
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

    // Create an instance of IGitProvider based on the provider type
    switch (gitProvider.source) {
      case GitProviderVendors.github:
        return new GithubProvider(token, this.logger).checkBranchExists(
          owner,
          repo,
          branch,
        );
      case GitProviderVendors.gitlab:
        return new GitlabProvider(
          token,
          this.logger,
          gitProvider.url || undefined,
        ).checkBranchExists(owner, repo, branch);
      default:
        throw new Error(
          `Unsupported git provider source: ${gitProvider.source}`,
        );
    }
  }
}
