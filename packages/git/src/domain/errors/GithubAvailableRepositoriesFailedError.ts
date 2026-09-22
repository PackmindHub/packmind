import { GitUpstreamError } from './GitUpstreamError';

/**
 * Listing the repositories the credentials can reach failed. The message is
 * deliberately detail-free — the downstream error is logged and carried in
 * `cause` instead — and nothing in a request would make the call succeed:
 * GitHub did not answer usably, so it is a 502.
 */
export class GithubAvailableRepositoriesFailedError extends GitUpstreamError {
  constructor(public readonly cause: unknown) {
    super(
      'upstream_unavailable',
      'github_available_repositories_failed',
      {},
      'Failed to fetch repositories from GitHub',
    );
    this.name = 'GithubAvailableRepositoriesFailedError';
  }
}
