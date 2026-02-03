import { IGitProviderFactory } from '../../domain/repositories/IGitProviderFactory';
import { IGitProvider } from '../../domain/repositories/IGitProvider';
import { GitProvider, GitProviderVendors } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { GithubProvider } from './github/GithubProvider';
import { GitlabProvider } from './gitlab/GitlabProvider';

const origin = 'GitProviderFactory';

/**
 * GitProviderFactory - Infrastructure implementation of the git provider factory
 *
 * This factory creates concrete git provider instances based on the provider type.
 * It encapsulates the instantiation logic and provider-specific configuration,
 * keeping the application layer clean from infrastructure dependencies.
 */
export class GitProviderFactory implements IGitProviderFactory {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  createGitProvider(provider: GitProvider): IGitProvider {
    if (!provider.token) {
      throw new Error('Git provider token not configured');
    }

    switch (provider.source) {
      case GitProviderVendors.github:
        return new GithubProvider(provider.token);

      case GitProviderVendors.gitlab:
        return new GitlabProvider(provider.token, provider.url || undefined);

      default:
        throw new Error(`Unsupported git provider source: ${provider.source}`);
    }
  }
}
