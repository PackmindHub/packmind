import { GitError } from './GitError';

/**
 * `conflict`, deliberately not `not_found`: the CLI already reads any 404 on
 * the tracking routes as "the feature is unavailable for your account" and
 * would print the wrong message.
 */
export class RepositoryNotTrackableError extends GitError {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
  ) {
    super(
      'conflict',
      'repository_not_trackable',
      { owner, repo },
      `Repository ${owner}/${repo} is not connected to Packmind, so its tracking cannot be removed`,
    );
    this.name = 'RepositoryNotTrackableError';
  }
}
