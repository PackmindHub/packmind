import { GitRepo, GitRepoId, MissingGitInputError } from '@packmind/types';
import { GitRepoService } from '../../GitRepoService';

export interface GetRepositoryByIdUseCaseInput {
  repositoryId: GitRepoId;
}

export class GetRepositoryByIdUseCase {
  constructor(private readonly gitRepoService: GitRepoService) {}

  async execute(input: GetRepositoryByIdUseCaseInput): Promise<GitRepo | null> {
    const { repositoryId } = input;

    if (!repositoryId) {
      throw new MissingGitInputError('Repository ID');
    }

    return this.gitRepoService.findGitRepoById(repositoryId);
  }
}
