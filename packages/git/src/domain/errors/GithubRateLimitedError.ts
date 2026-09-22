import { GitUpstreamError, GitUpstreamErrorContext } from './GitUpstreamError';

/**
 * GitHub is throttling us — its primary hourly quota is spent, or its
 * secondary limiter asked us to slow down. Neither is the caller's doing and
 * neither is a broken invariant of ours: waiting is the whole remedy, so it
 * answers 429 with `Retry-After` instead of a 500 with a stack.
 *
 * The message no longer hedges with "or access forbidden": a genuine
 * permission denial is now told apart by
 * {@link detectGithubRateLimit} and raised as `GitRemoteAccessForbiddenError`.
 */
export class GithubRateLimitedError extends GitUpstreamError {
  constructor(
    retryAfterSeconds: number,
    context: GitUpstreamErrorContext = {},
  ) {
    super(
      'upstream_rate_limited',
      'github_rate_limited',
      context,
      retryAfterSeconds > 0
        ? `GitHub is rate limiting us. Try again in ${retryAfterSeconds} seconds.`
        : 'GitHub is rate limiting us. Try again shortly.',
      retryAfterSeconds,
    );
    this.name = 'GithubRateLimitedError';
  }
}
