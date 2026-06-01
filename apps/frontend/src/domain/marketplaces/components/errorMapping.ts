import type { AxiosError } from 'axios';

/** Shown when the request never reached the server (no HTTP response). */
export const NETWORK_ERROR_MESSAGE =
  'The server could not be reached. Check your connection and try again.';

/** Shown when the server responded but carried no usable message. */
export const GENERIC_SUBMIT_ERROR_MESSAGE =
  'Something went wrong while linking the marketplace. Please try again.';

/**
 * Extracts a human-readable message from a thrown link / validate-url error.
 *
 * The backend (`marketplaces.controller.ts`) maps each typed domain error to a
 * NestJS HTTP exception whose body carries a descriptive `message` — we surface
 * it verbatim so the user sees the real reason (e.g. "Repository acme/foo is
 * already linked as a standard Git repository in this organization") instead of
 * a generic banner.
 *
 * Fallbacks: when the request never reached the server we show a connectivity
 * message; when it reached the server but carried no message we show a generic
 * one.
 */
export function getSubmitErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return NETWORK_ERROR_MESSAGE;
  }

  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  const response = axiosError.response;

  if (!response) {
    return NETWORK_ERROR_MESSAGE;
  }

  const message = response.data?.message;

  // NestJS validation pipes return `message` as a string array; join them.
  if (Array.isArray(message)) {
    const joined = message.filter((m) => typeof m === 'string').join(' ');
    if (joined.trim()) {
      return joined;
    }
  } else if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return GENERIC_SUBMIT_ERROR_MESSAGE;
}
