import { IGitProviderFactory } from '../../domain/repositories/IGitProviderFactory';
import { IGitProvider } from '../../domain/repositories/IGitProvider';
import { GitProvider, GitProviderVendors } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { GithubProvider } from './github/GithubProvider';
import { GitlabProvider } from './gitlab/GitlabProvider';
import { GithubTokenResolverFactory } from './github/auth/GithubTokenResolverFactory';

const origin = 'GitProviderFactory';

/**
 * GitProviderFactory - Infrastructure implementation of the git provider factory
 *
 * Creates concrete git provider instances based on the provider type.
 * For GitHub providers, delegates token resolution to the injected
 * `GithubTokenResolverFactory` which decides between PAT and App Installation
 * auth. GitLab providers continue to use raw PAT auth.
 */
export class GitProviderFactory implements IGitProviderFactory {
  constructor(
    private readonly tokenResolverFactory: GithubTokenResolverFactory,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async createGitProvider(provider: GitProvider): Promise<IGitProvider> {
    switch (provider.source) {
      case GitProviderVendors.github: {
        const resolver = await this.tokenResolverFactory.build(provider, {
          onRevoke: undefined, // step 6 will wire this
        });
        return new GithubProvider(resolver, this.logger);
      }

      case GitProviderVendors.gitlab:
        if (!provider.token) {
          throw new Error('GitLab provider token not configured');
        }
        return new GitlabProvider(provider.token, provider.url || undefined);

      default:
        throw new Error(`Unsupported git provider source: ${provider.source}`);
    }
  }
}
