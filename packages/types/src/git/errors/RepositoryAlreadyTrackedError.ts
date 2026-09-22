import { GitError } from './GitError';

/** Tracking is unique per (organization, owner, repo), not per branch. */
export class RepositoryAlreadyTrackedError extends GitError {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
    public readonly trackedBranch: string,
  ) {
    super(
      'conflict',
      'repository_already_tracked',
      { owner, repo, branch: trackedBranch },
      `Repository ${owner}/${repo} is already tracked on branch '${trackedBranch}'`,
    );
    this.name = 'RepositoryAlreadyTrackedError';
  }
}
