import { isPackmindError } from '../../services/api/errors/PackmindError';

/**
 * One retry, which is the budget the app had before this policy had a caller.
 *
 * Three attempts with query-core's exponential backoff is 1s + 2s + 4s, and a
 * route clientLoader spends all of it on `HydrateFallback`: the reader watches
 * `Loading Packmind...` for seven seconds and cannot tell that from a hang. It
 * is also measurable. `PrivateSpaceAccess.spec.ts` asserts within 5s that a
 * non-member has been moved off a private space, and that redirect waits on a
 * loader whose query answers 500. At three retries the suite went red.
 *
 * The cold-warmup case below is not served by a bigger count anyway: an API
 * still booting answers 5xx for tens of seconds, which no exponential backoff
 * bounded by four attempts was ever going to cover.
 */
const MAX_TRANSIENT_RETRIES = 1;

/**
 * Retry transient failures only — network errors and 5xx — while letting 4xx
 * surface immediately. Used by route clientLoaders that fire before the React
 * tree mounts: during a cold backend warmup, nginx briefly returns 5xx (or the
 * request fails outright); without retries those failures crash straight into
 * the route error boundary.
 */
export function shouldRetryTransient(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= MAX_TRANSIENT_RETRIES) return false;
  if (isPackmindError(error)) {
    return error.serverError.status >= 500;
  }
  // Non-PackmindError thrown from ApiService.handleError covers network
  // failures and 5xx with empty bodies — both worth retrying.
  return true;
}
