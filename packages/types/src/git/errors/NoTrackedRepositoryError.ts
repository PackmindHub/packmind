import { GitError } from './GitError';

/**
 * `conflict`, deliberately not `not_found`: the CLI already reads any 404 on
 * the tracking routes as "the feature is unavailable for your account" and
 * would print the wrong message.
 */
export class NoTrackedRepositoryError extends GitError {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
  ) {
    super(
      'conflict',
      'no_tracked_repository',
      { owner, repo },
      'Nothing is tracked yet — run `packmind init` or `packmind git track` to start tracking.',
    );
    this.name = 'NoTrackedRepositoryError';
  }
}
