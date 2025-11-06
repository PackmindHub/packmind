import { IGitRepoFactory } from '../../domain/repositories/IGitRepoFactory';
import { IGitRepo } from '../../domain/repositories/IGitRepo';
import {
  GitProvider,
  GitProviderVendors,
} from '../../domain/entities/GitProvider';
import { GitRepo } from '../../domain/entities/GitRepo';
import { PackmindLogger } from '@packmind/logger';
import { GithubRepository } from './github/GithubRepository';
import { GitlabRepository } from './gitlab/GitlabRepository';

const origin = 'GitRepoFactory';

/**
 * GitRepoFactory - Infrastructure implementation of the git repository factory
 *
 * This factory creates concrete git repository instances based on the provider type.
 * It encapsulates the instantiation logic and provider-specific configuration,
 * keeping the application layer clean from infrastructure dependencies.
 */
export class GitRepoFactory implements IGitRepoFactory {
  private readonly logger: PackmindLogger;

  constructor() {
    this.logger = new PackmindLogger(origin);
  }

  createGitRepo(gitRepo: GitRepo, provider: GitProvider): IGitRepo {
    if (!provider.token) {
      throw new Error('Git provider token not configured');
    }

    const repositoryOptions = {
      owner: gitRepo.owner,
      repo: gitRepo.repo,
      branch: gitRepo.branch,
    };

    switch (provider.source) {
      case GitProviderVendors.github:
        return new GithubRepository(
          provider.token,
          repositoryOptions,
          this.logger,
        );

      case GitProviderVendors.gitlab:
        return new GitlabRepository(
          provider.token,
          repositoryOptions,
          provider.url || undefined,
          this.logger,
        );

      default:
        throw new Error(`Unsupported git provider source: ${provider.source}`);
    }
  }
}
