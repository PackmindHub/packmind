import { GitRepo } from '../../../domain/entities/GitRepo';
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

    // Business rule: owner and repo are required
    if (!owner || !repo) {
      throw new Error('Owner and repository name are required');
    }

    return this.gitRepoService.findGitRepoByOwnerAndRepo(owner, repo, opts);
  }
}
