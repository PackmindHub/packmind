import { GitInternalError } from './GitInternalError';

/**
 * Listing the repositories the credentials can reach failed. The message is
 * deliberately detail-free — the downstream error is logged and carried in
 * `cause` instead — and nothing in a request would make the call succeed, so
 * it stays a 500.
 */
export class GithubAvailableRepositoriesFailedError extends GitInternalError {
  constructor(public readonly cause: unknown) {
    super(
      'github_available_repositories_failed',
      {},
      'Failed to fetch repositories from GitHub',
    );
    this.name = 'GithubAvailableRepositoriesFailedError';
  }
}
