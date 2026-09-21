import { isAxiosError } from 'axios';
import { PackmindLogger } from '@packmind/logger';

/**
 * Ceiling on a single provider round trip. Axios has no default, so a stalled
 * connection would hold the request open long after the browser gave up.
 */
export const PROVIDER_REQUEST_TIMEOUT_MS = 30_000;

const RETRY_DELAY_MS = 500;

// Statuses that say "not right now" rather than "no". Retrying anything else —
// 401, 403, 404 — only burns the reader's time to reach the same answer.
const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export const isTransientProviderError = (error: unknown): boolean => {
  if (!isAxiosError(error)) return false;

  // No response at all: connection reset, DNS hiccup, or our own timeout firing.
  if (!error.response) return true;

  return TRANSIENT_STATUSES.has(error.response.status);
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Give one provider call a second chance before it fails the batch around it:
 * listing repositories spans several provider pages, and a hiccup on any one
 * of them would otherwise discard every page already fetched.
 */
export async function withTransientRetry<T>(
  operation: () => Promise<T>,
  {
    logger,
    label,
    delayMs = RETRY_DELAY_MS,
  }: { logger: PackmindLogger; label: string; delayMs?: number },
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isTransientProviderError(error)) {
      throw error;
    }

    logger.warn('Provider request failed transiently, retrying once', {
      label,
      status: isAxiosError(error) ? error.response?.status : undefined,
    });

    await sleep(delayMs);
    return operation();
  }
}
