import { DeploymentsError } from './DeploymentsError';

/**
 * The git repository a target points at does not exist, or it is not
 * reachable from the organization the call was made through.
 *
 * One error for both, so a 403 never confirms that a repository id is real.
 */
export class GitRepositoryNotFoundError extends DeploymentsError {
  constructor(gitRepoId: string) {
    super(
      'not_found',
      'git_repository_not_found',
      { gitRepoId },
      `Repository with id "${gitRepoId}" was not found`,
    );
    this.name = 'GitRepositoryNotFoundError';
  }
}
