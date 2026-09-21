import { GitInternalError } from './GitInternalError';

/**
 * Listing the projects the token can reach failed. The message is
 * deliberately detail-free — the downstream error is logged and carried in
 * `cause` instead — and nothing in a request would make the call succeed, so
 * it stays a 500.
 */
export class GitlabAvailableRepositoriesFailedError extends GitInternalError {
  constructor(public readonly cause: unknown) {
    super(
      'gitlab_available_repositories_failed',
      {},
      'Failed to fetch repositories from GitLab',
    );
    this.name = 'GitlabAvailableRepositoriesFailedError';
  }
}
