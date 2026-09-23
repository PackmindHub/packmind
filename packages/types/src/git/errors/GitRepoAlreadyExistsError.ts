import { GitError } from './GitError';

export class GitRepoAlreadyExistsError extends GitError {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
    public readonly branch: string,
    public readonly organizationId: string,
  ) {
    super(
      'conflict',
      'git_repo_already_exists',
      { owner, repo, branch, organizationId },
      `Repository ${owner}/${repo} on branch '${branch}' already exists in this organization`,
    );
    this.name = 'GitRepoAlreadyExistsError';
  }
}
