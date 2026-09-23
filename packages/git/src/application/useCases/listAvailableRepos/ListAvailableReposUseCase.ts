import { GitProviderService } from '../../GitProviderService';
import {
  GitProviderNotFoundError,
  GitProviderTokenNotConfiguredError,
  IListAvailableReposUseCase,
  ListAvailableReposCommand,
  ListAvailableReposResponse,
  MissingGitInputError,
} from '@packmind/types';
import { GitProviderSourceNotConfiguredError } from '../../../domain/errors';

export class ListAvailableReposUseCase implements IListAvailableReposUseCase {
  constructor(private readonly gitProviderService: GitProviderService) {}

  async execute(
    command: ListAvailableReposCommand,
  ): Promise<ListAvailableReposResponse> {
    const { gitProviderId, page } = command;

    if (!gitProviderId) {
      throw new MissingGitInputError('Git provider ID');
    }

    const gitProvider =
      await this.gitProviderService.findGitProviderById(gitProviderId);
    if (!gitProvider) {
      throw new GitProviderNotFoundError(gitProviderId);
    }

    // App-auth providers carry no token on the row: the installation token is
    // minted on demand by GithubTokenResolverFactory downstream.
    if (gitProvider.authMethod !== 'app' && !gitProvider.token) {
      throw new GitProviderTokenNotConfiguredError(gitProviderId);
    }

    if (!gitProvider.source) {
      throw new GitProviderSourceNotConfiguredError(gitProviderId);
    }

    return this.gitProviderService.getAvailableRepos(gitProviderId, page ?? 1);
  }
}
