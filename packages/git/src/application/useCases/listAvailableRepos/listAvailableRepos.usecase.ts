import { GitProviderService } from '../../GitProviderService';
import { GitProviderId } from '@packmind/types';

export interface ListAvailableReposUseCaseInput {
  gitProviderId: GitProviderId;
}

export interface ExternalRepository {
  name: string;
  owner: string;
  description?: string;
  private: boolean;
  defaultBranch: string;
  language?: string;
  stars: number;
}

export class ListAvailableReposUseCase {
  constructor(private readonly gitProviderService: GitProviderService) {}

  async execute(
    input: ListAvailableReposUseCaseInput,
  ): Promise<ExternalRepository[]> {
    const { gitProviderId } = input;

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

    // Business rule: git provider must have a token configured
    if (!gitProvider.token) {
      throw new Error('Git provider token not configured');
    }

    // Business rule: git provider must have a valid source
    if (!gitProvider.source) {
      throw new Error('Git provider source not configured');
    }

    // Delegate to service for technical operation
    return this.gitProviderService.getAvailableRepos(gitProviderId);
  }
}
