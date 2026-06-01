import { isPackmindError } from '../../services/api/errors/PackmindError';

const MAX_TRANSIENT_RETRIES = 3;

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
