import { GitUpstreamError, GitUpstreamErrorContext } from './GitUpstreamError';
import { providerErrorMessage, statusOf } from './providerErrorMessage';

/**
 * A call we made to the GitLab API did not succeed — committing, branching,
 * opening a merge request, comparing refs, listing directories. The call went
 * out and did not come back usable, which is GitLab's failure rather than
 * ours or the caller's: 502 logged at `warn`, not a 500 with a stack. The
 * operation is what tells the reader which call it was, and the original
 * failure is kept in `cause`.
 */
export class GitlabApiOperationFailedError extends GitUpstreamError {
  constructor(
    operation: string,
    public readonly cause: unknown,
    context: GitUpstreamErrorContext = {},
  ) {
    super(
      'upstream_unavailable',
      'gitlab_api_operation_failed',
      { ...context, operation, status: context.status ?? statusOf(cause) },
      `Failed to ${operation}: ${providerErrorMessage(cause)}`,
    );
    this.name = 'GitlabApiOperationFailedError';
  }
}
