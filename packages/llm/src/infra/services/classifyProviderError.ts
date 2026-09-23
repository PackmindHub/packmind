import {
  AIServiceError,
  AIServiceErrorType,
  AIServiceErrorTypes,
} from '@packmind/types';

/**
 * Error names the provider SDKs use for failures that never got an HTTP
 * response. The Anthropic and OpenAI SDKs do not set `.name` on their error
 * classes, so the constructor name is checked as well.
 * - `APIConnectionError` / `APIConnectionTimeoutError`: @anthropic-ai/sdk, openai
 * - `AbortError`: fetch aborted by an SDK timeout (@google/genai)
 * - `TimeoutError`: `AbortSignal.timeout()` expiry
 */
const CONNECTION_ERROR_NAMES = new Set([
  'APIConnectionError',
  'APIConnectionTimeoutError',
  'AbortError',
  'TimeoutError',
]);

const NETWORK_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'EPIPE',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
]);

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * HTTP status of a provider failure: `error.status` for the Anthropic,
 * OpenAI and Google GenAI SDK errors, `error.response.status` for
 * axios-shaped errors.
 */
export function extractProviderStatus(error: unknown): number | undefined {
  const record = asRecord(error);
  if (!record) {
    return undefined;
  }

  if (typeof record['status'] === 'number') {
    return record['status'];
  }

  const response = asRecord(record['response']);
  if (response && typeof response['status'] === 'number') {
    return response['status'];
  }

  return undefined;
}

function isConnectionError(record: Record<string, unknown>): boolean {
  const name = record['name'];
  if (typeof name === 'string' && CONNECTION_ERROR_NAMES.has(name)) {
    return true;
  }

  const constructorName = (record['constructor'] as { name?: unknown })?.name;
  if (
    typeof constructorName === 'string' &&
    CONNECTION_ERROR_NAMES.has(constructorName)
  ) {
    return true;
  }

  const code = record['code'];
  if (typeof code === 'string' && NETWORK_ERROR_CODES.has(code)) {
    return true;
  }

  const causeCode = asRecord(record['cause'])?.['code'];
  return typeof causeCode === 'string' && NETWORK_ERROR_CODES.has(causeCode);
}

/**
 * Classifies a provider failure from its HTTP status, error name and socket
 * code. `error.message` is never read.
 */
export function classifyProviderError(error: unknown): AIServiceErrorType {
  if (error instanceof AIServiceError) {
    return error.type;
  }

  const status = extractProviderStatus(error);
  if (status !== undefined) {
    if (status === 429) {
      return AIServiceErrorTypes.RATE_LIMIT;
    }
    if (status === 401 || status === 403) {
      return AIServiceErrorTypes.AUTHENTICATION_ERROR;
    }
    if (status === 408) {
      return AIServiceErrorTypes.NETWORK_ERROR;
    }
    return AIServiceErrorTypes.API_ERROR;
  }

  const record = asRecord(error);
  if (record && isConnectionError(record)) {
    return AIServiceErrorTypes.NETWORK_ERROR;
  }

  return AIServiceErrorTypes.API_ERROR;
}
