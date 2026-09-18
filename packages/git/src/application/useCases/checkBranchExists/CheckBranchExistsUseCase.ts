import { GitProviderService } from '../../GitProviderService';
import { GitProviderId, GitProviderNotFoundError } from '@packmind/types';

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
      throw new Error('Git provider ID is required');
    }
    if (!owner) {
      throw new Error('Repository owner is required');
    }
    if (!repo) {
      throw new Error('Repository name is required');
    }
    if (!branch) {
      throw new Error('Branch name is required');
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

    return this.gitProviderService.checkBranchExists(
      gitProviderId,
      owner,
      repo,
      branch,
    );
  }
}
