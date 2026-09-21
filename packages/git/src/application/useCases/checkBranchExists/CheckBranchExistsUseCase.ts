import { GitProviderService } from '../../GitProviderService';
import {
  GitProviderId,
  GitProviderNotFoundError,
  GitProviderTokenNotConfiguredError,
  MissingGitInputError,
} from '@packmind/types';
import { GitProviderSourceNotConfiguredError } from '../../../domain/errors';

export interface CheckBranchExistsUseCaseInput {
  gitProviderId: GitProviderId;
  owner: string;
  repo: string;
  branch: string;
}

export class CheckBranchExistsUseCase {
  constructor(private readonly gitProviderService: GitProviderService) {}

  async execute(input: CheckBranchExistsUseCaseInput): Promise<boolean> {
    const { gitProviderId, owner, repo, branch } = input;

    if (!gitProviderId) {
      throw new MissingGitInputError('Git provider ID');
    }
    if (!owner) {
      throw new MissingGitInputError('Repository owner');
    }
    if (!repo) {
      throw new MissingGitInputError('Repository name');
    }
    if (!branch) {
      throw new MissingGitInputError('Branch name');
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

    return this.gitProviderService.checkBranchExists(
      gitProviderId,
      owner,
      repo,
      branch,
    );
  }
}
