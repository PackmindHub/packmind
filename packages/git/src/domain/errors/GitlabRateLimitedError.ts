import { GitUpstreamError, GitUpstreamErrorContext } from './GitUpstreamError';

/**
 * GitLab is throttling us. Like its GitHub sibling this is nobody's mistake —
 * not the caller's, not a broken invariant of ours — so waiting is the whole
 * remedy: 429 with `Retry-After` rather than the 502 a generic GitLab
 * failure answers, which would tell the caller GitLab is broken and invite
 * the frontend to retry straight into the same limit.
 */
export class GitlabRateLimitedError extends GitUpstreamError {
  constructor(
    retryAfterSeconds: number,
    context: GitUpstreamErrorContext = {},
  ) {
    super(
      'upstream_rate_limited',
      'gitlab_rate_limited',
      context,
      retryAfterSeconds > 0
        ? `GitLab is rate limiting us. Try again in ${retryAfterSeconds} seconds.`
        : 'GitLab is rate limiting us. Try again shortly.',
      retryAfterSeconds,
    );
    this.name = 'GitlabRateLimitedError';
  }
}
