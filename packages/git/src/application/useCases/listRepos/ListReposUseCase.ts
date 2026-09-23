import { GitRepo } from '@packmind/types';
import {
  GitProviderId,
  GitProviderNotFoundError,
  MissingGitInputError,
} from '@packmind/types';
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

    if (!gitProviderId) {
      throw new MissingGitInputError('Git provider ID');
    }

    const gitProvider =
      await this.gitProviderService.findGitProviderById(gitProviderId);
    if (!gitProvider) {
      throw new GitProviderNotFoundError(gitProviderId);
    }

    return this.gitRepoService.findGitReposByProviderId(gitProviderId);
  }
}
