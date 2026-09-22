import { isAxiosError } from 'axios';
import { headerAsNumber } from './responseHeaders';
import {
  GitUpstreamErrorContext,
  GitlabRateLimitedError,
} from '../../../domain/errors';

/**
 * What GitLab told us about the throttle, once it is established there is
 * one. The caller gets a single number rather than a taxonomy of GitLab's
 * several limiters — request rate, authenticated API, protected paths — since
 * every one of them wants the same answer: wait, then try again.
 */
export type GitlabRateLimit = {
  /**
   * Seconds to wait before retrying. `0` when GitLab throttled us without
   * saying for how long, or named a reset already in the past.
   */
  readonly retryAfterSeconds: number;
};

/**
 * Decide whether a failed GitLab call was throttled, by reading the response
 * rather than matching on axios's `"Request failed with status code 429"`.
 *
 * This is shorter than its GitHub counterpart by design, not by omission.
 * GitHub overloads 403 between "you are going too fast" and "you may not do
 * that", so `detectGithubRateLimit` has to consult `x-ratelimit-remaining`
 * and `retry-after` before it can tell a throttle from a refusal. GitLab
 * keeps the two apart itself: it throttles with 429 and refuses with 403.
 * The status is therefore the whole trigger here, and a 403 is a refusal no
 * header can turn into a throttle.
 *
 * The wait, when GitLab names one:
 *
 * - `retry-after`, in seconds, wins when present.
 * - otherwise `RateLimit-Reset` — a unix timestamp in seconds, and note the
 *   name is GitLab's own rather than GitHub's `x-ratelimit-reset` — minus
 *   now.
 * - otherwise `0`. GitLab omits these headers on some endpoints and on
 *   self-managed instances, and a throttle we cannot time is still a
 *   throttle.
 *
 * Returns `null` for anything that is not an axios error, and for every
 * status other than 429.
 */
export function detectGitlabRateLimit(
  error: unknown,
  nowMs: number = Date.now(),
): GitlabRateLimit | null {
  if (!isAxiosError(error)) {
    return null;
  }

  if (error.response?.status !== 429) {
    return null;
  }

  return {
    retryAfterSeconds: retryAfterSeconds(error.response.headers, nowMs),
  };
}

/**
 * The throttle error for a failure that is one, and `null` for a failure that
 * is not — so a call site reads
 *
 * ```ts
 * const throttled = gitlabRateLimitedError(error, { owner, repo });
 * if (throttled) throw throttled;
 * ```
 *
 * and the throw stays visible where it happens. A helper that threw for us
 * would read as a plain call and hide the exit from every reader of those
 * catch blocks.
 */
export function gitlabRateLimitedError(
  error: unknown,
  context: GitUpstreamErrorContext = {},
): GitlabRateLimitedError | null {
  const rateLimit = detectGitlabRateLimit(error);
  if (!rateLimit) {
    return null;
  }

  return new GitlabRateLimitedError(rateLimit.retryAfterSeconds, context);
}

function retryAfterSeconds(headers: unknown, nowMs: number): number {
  const retryAfter = headerAsNumber(headers, 'retry-after');
  if (retryAfter !== undefined) {
    return atLeastZero(retryAfter);
  }

  const resetAtSeconds = headerAsNumber(headers, 'ratelimit-reset');
  if (resetAtSeconds === undefined) {
    return 0;
  }

  return atLeastZero(Math.ceil(resetAtSeconds - nowMs / 1000));
}

const atLeastZero = (seconds: number): number =>
  seconds > 0 ? Math.ceil(seconds) : 0;
