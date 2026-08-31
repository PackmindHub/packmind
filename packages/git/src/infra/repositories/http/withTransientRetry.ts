import { AxiosInstance, InternalAxiosRequestConfig, isAxiosError } from 'axios';
import { PackmindLogger } from '@packmind/logger';

/**
 * Ceiling on a single provider round trip. Without one, axios waits forever:
 * a stalled connection held the whole request open long after the browser had
 * given up on it, so the reader waited on a response nobody would ever read.
 */
export const PROVIDER_REQUEST_TIMEOUT_MS = 10_000;

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
 * Give one provider call a second chance before it fails the batch around it.
 * Listing repositories can span several provider pages, and a single hiccup on
 * any one of them used to discard every page already fetched.
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

/**
 * Connection-level failures that mean the socket died before the request was
 * answered. These are the shape a stale keep-alive connection takes: we picked
 * a pooled socket the peer had already closed, and the write failed.
 *
 * Deliberately does not include ECONNABORTED — that is axios reporting our own
 * timeout, where retrying just makes the caller wait twice as long.
 */
const STALE_SOCKET_CODES = new Set(['ECONNRESET', 'EPIPE']);

/**
 * Only requests that can be replayed without changing anything. A reset can
 * happen after the server accepted the request but before it answered, and
 * nothing in the error distinguishes that from a reset on the way out — so a
 * retried POST risks committing twice.
 */
const REPLAYABLE_METHODS = new Set(['get', 'head', 'options']);

const RETRIED_FLAG = 'packmindStaleSocketRetry';

/**
 * Pooled connections trade a handshake for the chance of picking a socket the
 * peer has already reaped. That race is the cost of keeping sockets around, and
 * it is paid by whichever request happens to draw the dead one — so absorb it
 * here, once per client, rather than leaving it to surface as a failed
 * deployment.
 *
 * This complements `withTransientRetry`: that one handles a provider answering
 * "not right now" on the handful of paths it wraps, this one handles the
 * connection never carrying the request at all, on every read the client makes.
 */
export function retryStaleSocketReads(
  client: AxiosInstance,
  logger: PackmindLogger,
): void {
  client.interceptors.response.use(undefined, async (error: unknown) => {
    if (!isAxiosError(error) || error.response) {
      throw error;
    }

    const config = error.config as
      | (InternalAxiosRequestConfig & { [RETRIED_FLAG]?: boolean })
      | undefined;

    if (
      !config ||
      config[RETRIED_FLAG] ||
      !STALE_SOCKET_CODES.has(error.code ?? '') ||
      !REPLAYABLE_METHODS.has((config.method ?? 'get').toLowerCase())
    ) {
      throw error;
    }

    config[RETRIED_FLAG] = true;
    logger.debug('Retrying request that lost a pooled connection', {
      url: config.url,
      code: error.code,
    });

    // Immediately, and on a fresh socket: nothing is backing off here, the
    // connection was simply already gone.
    return client.request(config);
  });
}
