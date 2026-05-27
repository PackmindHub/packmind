import { IGitRepoFactory } from '../../domain/repositories/IGitRepoFactory';
import { IGitRepo } from '../../domain/repositories/IGitRepo';
import { IGitHubAppConfigRepository } from '../../domain/repositories/IGitHubAppConfigRepository';
import {
  GitProvider,
  GitProviderAuthTypes,
  GitProviderVendors,
} from '@packmind/types';
import { GitRepo } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { GithubRepository } from './github/GithubRepository';
import { GitlabRepository } from './gitlab/GitlabRepository';
import { GithubAppTokenService } from '../../application/services/GithubAppTokenService';

const origin = 'GitRepoFactory';

export class GitRepoFactory implements IGitRepoFactory {
  constructor(
    private readonly githubAppConfigRepository: IGitHubAppConfigRepository,
    private readonly githubAppTokenService: GithubAppTokenService = new GithubAppTokenService(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  createGitRepo(gitRepo: GitRepo, provider: GitProvider): IGitRepo {
    const repositoryOptions = {
      owner: gitRepo.owner,
      repo: gitRepo.repo,
      branch: gitRepo.branch,
    };

    switch (provider.source) {
      case GitProviderVendors.github:
        return this.createGithubRepository(provider, repositoryOptions);

      case GitProviderVendors.gitlab:
        if (!provider.token) {
          throw new Error('Git provider token not configured');
        }
        return new GitlabRepository(
          provider.token,
          repositoryOptions,
          provider.url || undefined,
        );

      default:
        throw new Error(`Unsupported git provider source: ${provider.source}`);
    }
  }

  private createGithubRepository(
    provider: GitProvider,
    repositoryOptions: { owner: string; repo: string; branch?: string },
  ): IGitRepo {
    const authType = provider.authType ?? GitProviderAuthTypes.pat;

    if (authType === GitProviderAuthTypes.github_app) {
      if (!provider.githubAppInstallationId) {
        throw new Error(
          'githubAppInstallationId is required for GitHub App authentication',
        );
      }

      const installationId = provider.githubAppInstallationId;
      const getToken = async (): Promise<string> => {
        const config = await this.githubAppConfigRepository.findActive();
        if (!config) {
          throw new Error('No active GitHub App configuration found');
        }
        return this.githubAppTokenService.getInstallationToken(
          config,
          installationId,
        );
      };

      return new GithubRepository(getToken, repositoryOptions, this.logger);
    }

    if (!provider.token) {
      throw new Error('Git provider token not configured');
    }

    const patToken = provider.token;
    return new GithubRepository(
      async () => patToken,
      repositoryOptions,
      this.logger,
    );
  }
}
