import { GitProviderService } from '../../GitProviderService';
import { GitProviderId } from '@packmind/types';

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

    // Business rule: all parameters are required
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

    // Business rule: git provider must exist
    const gitProvider =
      await this.gitProviderService.findGitProviderById(gitProviderId);
    if (!gitProvider) {
      throw new Error('Git provider not found');
    }

    // Business rule: git provider must have a token configured
    if (!gitProvider.token) {
      throw new Error('Git provider token not configured');
    }

    // Business rule: git provider must have a valid source
    if (!gitProvider.source) {
      throw new Error('Git provider source not configured');
    }

    // Delegate to service for technical operation
    return this.gitProviderService.checkBranchExists(
      gitProviderId,
      owner,
      repo,
      branch,
    );
  }
}
