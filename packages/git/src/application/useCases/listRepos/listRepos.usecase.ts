import { GitRepo } from '../../../domain/entities/GitRepo';
import { GitProviderId } from '../../../domain/entities/GitProvider';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';

export interface ListReposUseCaseInput {
  gitProviderId: GitProviderId;
}

export class ListReposUseCase {
  constructor(
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoService: GitRepoService,
  ) {}

  async execute(input: ListReposUseCaseInput): Promise<GitRepo[]> {
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

    return this.gitRepoService.findGitReposByProviderId(gitProviderId);
  }
}
