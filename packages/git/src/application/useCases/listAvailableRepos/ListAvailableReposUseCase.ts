import { GitProviderService } from '../../GitProviderService';
import {
  IListAvailableReposUseCase,
  ListAvailableReposCommand,
  ListAvailableReposResponse,
} from '@packmind/types';

export class ListAvailableReposUseCase implements IListAvailableReposUseCase {
  constructor(private readonly gitProviderService: GitProviderService) {}

  async execute(
    command: ListAvailableReposCommand,
  ): Promise<ListAvailableReposResponse> {
    const { gitProviderId, page } = command;

    // Business rule: gitProviderId is required
    if (!gitProviderId) {
      throw new Error('Git provider ID is required');
    }

    // Business rule: git provider must exist
    const gitProvider =
      await this.gitProviderService.findGitProviderById(gitProviderId);
    if (!gitProvider) {
      throw new Error('Git provider not found');
    }

    // Business rule: token-auth providers must have a token configured.
    // App-auth providers carry no token on the row — the installation token
    // is minted on demand by GithubTokenResolverFactory downstream.
    if (gitProvider.authMethod !== 'app' && !gitProvider.token) {
      throw new Error('Git provider token not configured');
    }

    // Business rule: git provider must have a valid source
    if (!gitProvider.source) {
      throw new Error('Git provider source not configured');
    }

    // Delegate to service for technical operation
    return this.gitProviderService.getAvailableRepos(gitProviderId, page ?? 1);
  }
}
