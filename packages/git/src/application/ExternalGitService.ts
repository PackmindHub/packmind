import {
  GitProviderVendors,
  GitProvider,
} from '../domain/entities/GitProvider';
import { GithubProvider } from '../infra/repositories/github/GithubProvider';
import { GitlabProvider } from '../infra/repositories/gitlab/GitlabProvider';
import { PackmindLogger } from '@packmind/shared';

export interface ExternalRepository {
  name: string;
  owner: string;
  description?: string;
  private: boolean;
  defaultBranch: string;
  language?: string;
  stars: number;
}

export class ExternalGitService {
  constructor(private readonly logger: PackmindLogger) {}

  async listAvailableRepositories(
    gitProvider: GitProvider,
  ): Promise<ExternalRepository[]> {
    const provider = this.createGitProviderInstance(gitProvider);
    return provider.listAvailableRepositories();
  }

  async checkBranchExists(
    gitProvider: GitProvider,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    const provider = this.createGitProviderInstance(gitProvider);
    return provider.checkBranchExists(owner, repo, branch);
  }

  private createGitProviderInstance(gitProvider: GitProvider) {
    if (!gitProvider.token) {
      throw new Error('Git provider token not configured');
    }

    switch (gitProvider.source) {
      case GitProviderVendors.github:
        return new GithubProvider(gitProvider.token, this.logger);
      case GitProviderVendors.gitlab:
        return new GitlabProvider(
          gitProvider.token,
          this.logger,
          gitProvider.url || undefined,
        );
      default:
        throw new Error(
          `Unsupported git provider source: ${gitProvider.source}`,
        );
    }
  }
}
