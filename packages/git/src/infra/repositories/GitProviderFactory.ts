import {
  GitProviderCredentials,
  IGitProviderFactory,
} from '../../domain/repositories/IGitProviderFactory';
import { IGitProvider } from '../../domain/repositories/IGitProvider';
import { GitProviderVendors } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { GithubProvider } from './github/GithubProvider';
import { GitlabProvider } from './gitlab/GitlabProvider';
import { GithubTokenResolverFactory } from './github/auth/GithubTokenResolverFactory';

const origin = 'GitProviderFactory';

/**
 * GitHub providers delegate token resolution to the injected
 * `GithubTokenResolverFactory`, which picks between PAT and App installation
 * auth; GitLab only ever uses a raw PAT.
 */
export class GitProviderFactory implements IGitProviderFactory {
  constructor(
    private readonly tokenResolverFactory: GithubTokenResolverFactory,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async createGitProvider(
    provider: GitProviderCredentials,
  ): Promise<IGitProvider> {
    switch (provider.source) {
      case GitProviderVendors.github: {
        const resolver = await this.tokenResolverFactory.build(provider);
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
