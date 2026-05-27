import { IGitProviderFactory } from '../../domain/repositories/IGitProviderFactory';
import { IGitProvider } from '../../domain/repositories/IGitProvider';
import { IGitHubAppConfigRepository } from '../../domain/repositories/IGitHubAppConfigRepository';
import {
  GitProvider,
  GitProviderVendors,
  GitProviderAuthTypes,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { GithubProvider } from './github/GithubProvider';
import { GitlabProvider } from './gitlab/GitlabProvider';
import { GithubAppTokenService } from '../../application/services/GithubAppTokenService';

const origin = 'GitProviderFactory';

export class GitProviderFactory implements IGitProviderFactory {
  constructor(
    private readonly githubAppConfigRepository: IGitHubAppConfigRepository,
    private readonly githubAppTokenService: GithubAppTokenService = new GithubAppTokenService(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  createGitProvider(provider: GitProvider): IGitProvider {
    switch (provider.source) {
      case GitProviderVendors.github:
        return this.createGithubProvider(provider);

      case GitProviderVendors.gitlab:
        if (!provider.token) {
          throw new Error('Git provider token not configured');
        }
        return new GitlabProvider(provider.token, provider.url || undefined);

      default:
        throw new Error(`Unsupported git provider source: ${provider.source}`);
    }
  }

  private createGithubProvider(provider: GitProvider): IGitProvider {
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

      return new GithubProvider(getToken, this.logger);
    }

    if (!provider.token) {
      throw new Error('Git provider token not configured');
    }

    const patToken = provider.token;
    return new GithubProvider(async () => patToken, this.logger);
  }
}
