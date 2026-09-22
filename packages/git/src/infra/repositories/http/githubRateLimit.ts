import { isAxiosError } from 'axios';
import { headerAsNumber } from './responseHeaders';
import { isTransientProviderError } from './withTransientRetry';

/**
 * What GitHub told us about the throttle, once it is established there is
 * one. The two throttles GitHub runs — the primary hourly quota and the
 * secondary "abuse detection" limiter — differ only in which header carries
 * the wait, so the caller gets a single number rather than a taxonomy it
 * would have nothing to do with.
 */
export type GithubRateLimit = {
  /**
   * Seconds to wait before retrying. `0` when GitHub throttled us without
   * saying for how long, or said a reset already in the past.
   */
  readonly retryAfterSeconds: number;
};

/**
 * Decide whether a failed GitHub call was throttled, by reading the response
 * rather than matching on axios's `"Request failed with status code 403"`.
 *
 * GitHub overloads 403 between "you are going too fast" and "you may not do
 * that", and the two want opposite answers from us — a 429 with a wait, or a
 * 403 the caller has to fix. A substring match on the message cannot tell
 * them apart, which is why the error it produced had to hedge with "rate
 * limit exceeded *or* access forbidden".
 *
 * - **Primary rate limit**: 403 (or 429) with `x-ratelimit-remaining: 0`; the
 *   wait comes from `x-ratelimit-reset`, a unix timestamp in seconds.
 * - **Secondary rate limit** (abuse detection): 403 with `retry-after`, in
 *   seconds, which wins over the reset when both are present.
 * - **Permission denial**: 403 with neither. Returns `null` — it is not a
 *   throttle and waiting will not help.
 *
 * Returns `null` for anything that is not an axios error, and for statuses
 * other than 403 and 429.
 */
export function detectGithubRateLimit(
  error: unknown,
  nowMs: number = Date.now(),
): GithubRateLimit | null {
  if (!isAxiosError(error)) {
    return null;
  }

  const status = error.response?.status;
  if (status !== 403 && status !== 429) {
    return null;
  }

  const headers = error.response?.headers;
  const remaining = headerAsNumber(headers, 'x-ratelimit-remaining');
  const retryAfter = headerAsNumber(headers, 'retry-after');

  // A 429 needs no header to be believed: it is already one of the statuses
  // `withTransientRetry` reads as "not right now". A 403 is not one of them,
  // so it only counts as a throttle when GitHub's headers say so.
  const throttled =
    (status === 429 && isTransientProviderError(error)) ||
    remaining === 0 ||
    retryAfter !== undefined;

  if (!throttled) {
    return null;
  }

  return { retryAfterSeconds: retryAfterSeconds(headers, retryAfter, nowMs) };
}

function retryAfterSeconds(
  headers: unknown,
  retryAfter: number | undefined,
  nowMs: number,
): number {
  if (retryAfter !== undefined) {
    return atLeastZero(retryAfter);
  }

  const resetAtSeconds = headerAsNumber(headers, 'x-ratelimit-reset');
  if (resetAtSeconds === undefined) {
    return 0;
  }

  return atLeastZero(Math.ceil(resetAtSeconds - nowMs / 1000));
}

const atLeastZero = (seconds: number): number =>
  seconds > 0 ? Math.ceil(seconds) : 0;
