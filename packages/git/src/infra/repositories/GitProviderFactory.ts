import { IGitProviderFactory } from '../../domain/repositories/IGitProviderFactory';
import { IGitProvider } from '../../domain/repositories/IGitProvider';
import {
  GitProvider,
  GitProviderVendors,
} from '../../domain/entities/GitProvider';
import { PackmindLogger } from '@packmind/shared';
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
  private readonly logger: PackmindLogger;

  constructor() {
    this.logger = new PackmindLogger(origin);
  }

  createGitProvider(provider: GitProvider): IGitProvider {
    switch (provider.source) {
      case GitProviderVendors.github: {
        // Check for GitHub App authentication
        if (
          provider.appId &&
          provider.privateKey &&
          provider.installationId
        ) {
          return new GithubProvider({
            type: 'app',
            appId: provider.appId,
            privateKey: provider.privateKey,
            installationId: provider.installationId,
          });
        }

        // Fallback to token authentication
        if (!provider.token) {
          throw new Error(
            'GitHub provider requires either token or GitHub App credentials (appId, privateKey, installationId)',
          );
        }

        return new GithubProvider({ type: 'token', token: provider.token });
      }

      case GitProviderVendors.gitlab: {
        if (!provider.token) {
          throw new Error('GitLab provider token not configured');
        }

        return new GitlabProvider(
          provider.token,
          this.logger,
          provider.url || undefined,
        );
      }

      default:
        throw new Error(`Unsupported git provider source: ${provider.source}`);
    }
  }
}
