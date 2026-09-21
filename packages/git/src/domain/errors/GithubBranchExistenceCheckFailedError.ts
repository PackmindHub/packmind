import { isNativeError } from 'util/types';
import { GitUpstreamError } from './GitUpstreamError';

/**
 * Probing whether a branch exists failed with something other than the 404,
 * 403 and 401 the call site already tells apart. Whatever GitHub did instead
 * is GitHub's, so it answers 502. The two message shapes are the two the call
 * site used to build: a native error contributes its message, an unknown
 * throw is stringified.
 */
export class GithubBranchExistenceCheckFailedError extends GitUpstreamError {
  constructor(
    owner: string,
    repo: string,
    branch: string,
    public readonly cause: unknown,
  ) {
    super(
      'upstream_unavailable',
      'github_branch_existence_check_failed',
      { owner, repo, branch },
      isNativeError(cause)
        ? `Failed to check if branch exists for ${owner}/${repo}/${branch}: ${cause.message}`
        : `Failed to check if branch exists for ${owner}/${repo}/${branch}, got error: ${cause}`,
    );
    this.name = 'GithubBranchExistenceCheckFailedError';
  }
}
