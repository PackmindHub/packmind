import { GitError } from './GitError';

/**
 * Linking a repo that is already a standard (non-marketplace) GitRepo would
 * create a cross-type collision, so the link is rejected and the admin resolves
 * the conflict explicitly.
 */
export class GitRepoAlreadyLinkedAsStandardError extends GitError {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
  ) {
    super(
      'conflict',
      'git_repo_already_linked_as_standard',
      { owner, repo },
      `Repository ${owner}/${repo} is already linked as a standard Git repository in this organization`,
    );
    this.name = 'GitRepoAlreadyLinkedAsStandardError';
  }
}
