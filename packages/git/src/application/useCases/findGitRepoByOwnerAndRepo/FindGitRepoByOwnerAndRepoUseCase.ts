import { GitRepo, MissingGitInputError } from '@packmind/types';
import { GitRepoService } from '../../GitRepoService';
import { QueryOption } from '@packmind/types';

export interface FindGitRepoByOwnerAndRepoUseCaseInput {
  owner: string;
  repo: string;
  opts?: Pick<QueryOption, 'includeDeleted'>;
}

export class FindGitRepoByOwnerAndRepoUseCase {
  constructor(private readonly gitRepoService: GitRepoService) {}

  async execute(
    input: FindGitRepoByOwnerAndRepoUseCaseInput,
  ): Promise<GitRepo | null> {
    const { owner, repo, opts } = input;

    if (!owner) {
      throw new MissingGitInputError('Repository owner');
    }

    if (!repo) {
      throw new MissingGitInputError('Repository name');
    }

    return this.gitRepoService.findGitRepoByOwnerAndRepo(owner, repo, opts);
  }
}
