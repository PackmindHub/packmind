import { GitRepo, GitRepoId } from '@packmind/types';
import { GitRepoService } from '../../GitRepoService';

export interface GetRepositoryByIdUseCaseInput {
  repositoryId: GitRepoId;
}

export class GetRepositoryByIdUseCase {
  constructor(private readonly gitRepoService: GitRepoService) {}

  async execute(input: GetRepositoryByIdUseCaseInput): Promise<GitRepo | null> {
    const { repositoryId } = input;

    // Business rule: repositoryId is required
    if (!repositoryId) {
      throw new Error('Repository ID is required');
    }

    return this.gitRepoService.findGitRepoById(repositoryId);
  }
}
