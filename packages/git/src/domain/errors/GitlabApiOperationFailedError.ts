import { GitInternalError, GitInternalErrorContext } from './GitInternalError';

/**
 * A call we made to the GitLab API did not succeed — committing, branching,
 * opening a merge request, comparing refs, listing directories. What went
 * wrong downstream is arbitrary and none of it is the caller's to correct,
 * so it stays a 500; the operation is what tells the reader which call it
 * was, and the original failure is kept in `cause`.
 */
export class GitlabApiOperationFailedError extends GitInternalError {
  constructor(
    operation: string,
    public readonly cause: unknown,
    context: GitInternalErrorContext = {},
  ) {
    super(
      'gitlab_api_operation_failed',
      { ...context, operation },
      `Failed to ${operation}: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    this.name = 'GitlabApiOperationFailedError';
  }
}
