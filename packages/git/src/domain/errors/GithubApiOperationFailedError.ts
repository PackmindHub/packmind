import { GitUpstreamError, GitUpstreamErrorContext } from './GitUpstreamError';
import { providerErrorMessage, statusOf } from './providerErrorMessage';

/**
 * A call we made to the GitHub API did not succeed — committing, branching,
 * opening a pull request, comparing refs, listing directories. What went
 * wrong is GitHub's, not ours and not the caller's, so it answers 502 and is
 * logged at `warn`; the operation is what tells the reader which call it
 * was, and the original failure is kept in `cause`.
 */
export class GithubApiOperationFailedError extends GitUpstreamError {
  constructor(
    operation: string,
    public readonly cause: unknown,
    context: GitUpstreamErrorContext = {},
  ) {
    super(
      'upstream_unavailable',
      'github_api_operation_failed',
      { ...context, operation, status: context.status ?? statusOf(cause) },
      `Failed to ${operation}: ${providerErrorMessage(cause)}`,
    );
    this.name = 'GithubApiOperationFailedError';
  }
}
