import { GitProviderService } from '../../GitProviderService';
import {
  GitProviderNotFoundError,
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

    if (!gitProviderId) {
      throw new Error('Git provider ID is required');
    }

    const gitProvider =
      await this.gitProviderService.findGitProviderById(gitProviderId);
    if (!gitProvider) {
      throw new GitProviderNotFoundError(gitProviderId);
    }

    // App-auth providers carry no token on the row: the installation token is
    // minted on demand by GithubTokenResolverFactory downstream.
    if (gitProvider.authMethod !== 'app' && !gitProvider.token) {
      throw new Error('Git provider token not configured');
    }

    if (!gitProvider.source) {
      throw new Error('Git provider source not configured');
    }

    return this.gitProviderService.getAvailableRepos(gitProviderId, page ?? 1);
  }
}
