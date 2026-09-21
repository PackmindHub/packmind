import { GitUpstreamError } from './GitUpstreamError';

/**
 * Listing the projects the token can reach failed. The message is
 * deliberately detail-free — the downstream error is logged and carried in
 * `cause` instead — and nothing in a request would make the call succeed:
 * GitLab did not answer us usably, so it is a 502.
 */
export class GitlabAvailableRepositoriesFailedError extends GitUpstreamError {
  constructor(public readonly cause: unknown) {
    super(
      'upstream_unavailable',
      'gitlab_available_repositories_failed',
      {},
      'Failed to fetch repositories from GitLab',
    );
    this.name = 'GitlabAvailableRepositoriesFailedError';
  }
}
