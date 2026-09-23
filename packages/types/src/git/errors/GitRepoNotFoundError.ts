import { GitError } from './GitError';

export class GitRepoNotFoundError extends GitError {
  constructor(public readonly gitRepoId: string) {
    super(
      'not_found',
      'git_repo_not_found',
      { gitRepoId },
      'Git repository not found',
    );
    this.name = 'GitRepoNotFoundError';
  }
}
