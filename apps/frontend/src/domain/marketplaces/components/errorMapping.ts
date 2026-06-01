import { isPackmindError } from '../../../services/api/errors/PackmindError';

/** Shown when the request never reached the server (no usable server message). */
export const NETWORK_ERROR_MESSAGE =
  'The server could not be reached. Check your connection and try again.';

/**
 * Extracts a human-readable message from a thrown link / validate-url error.
 *
 * The shared `ApiService` wraps HTTP errors in a `PackmindError` whose
 * `serverError.data.message` carries the backend's detail — the typed domain
 * errors mapped in `marketplaces.controller.ts` (e.g. "Repository acme/foo is
 * already linked as a standard Git repository in this organization") surface
 * here verbatim. Anything else (a genuine connectivity failure, an unexpected
 * shape) falls back to a generic connectivity message.
 */
export function getSubmitErrorMessage(error: unknown): string {
  if (isPackmindError(error)) {
    const message = error.serverError.data.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return NETWORK_ERROR_MESSAGE;
}
