import { IGitRepoFactory } from '../../domain/repositories/IGitRepoFactory';
import { IGitRepo } from '../../domain/repositories/IGitRepo';
import { GitProvider, GitProviderVendors, GitRepo } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { GithubRepository } from './github/GithubRepository';
import { GitlabRepository } from './gitlab/GitlabRepository';
import { GithubTokenResolverFactory } from './github/auth/GithubTokenResolverFactory';

const origin = 'GitRepoFactory';

/**
 * GitRepoFactory - Infrastructure implementation of the git repository factory
 *
 * Creates concrete git repository instances based on the provider type.
 * For GitHub repositories, delegates token resolution to the injected
 * `GithubTokenResolverFactory` which decides between PAT and App Installation
 * auth. GitLab repositories continue to use raw PAT auth.
 */
export class GitRepoFactory implements IGitRepoFactory {
  constructor(
    private readonly tokenResolverFactory: GithubTokenResolverFactory,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async createGitRepo(
    gitRepo: GitRepo,
    provider: GitProvider,
  ): Promise<IGitRepo> {
    const repositoryOptions = {
      owner: gitRepo.owner,
      repo: gitRepo.repo,
      branch: gitRepo.branch,
    };

    switch (provider.source) {
      case GitProviderVendors.github: {
        const resolver = await this.tokenResolverFactory.build(provider, {
          onRevoke: undefined, // step 6 will wire this
        });
        return new GithubRepository(resolver, repositoryOptions, this.logger);
      }

      case GitProviderVendors.gitlab:
        if (!provider.token) {
          throw new Error('GitLab provider token not configured');
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
}
