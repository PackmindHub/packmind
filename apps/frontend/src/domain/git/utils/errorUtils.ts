import { isPackmindError } from '../../../services/api/errors/PackmindError';

/**
 * Extracts the error message from an error object, preferring server error messages
 * over generic fallback messages.
 *
 * @param error - The error object (could be PackmindError or generic Error)
 * @param fallbackMessage - Generic message to use if no specific server message is available
 * @returns The extracted error message
 */
export function extractErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (isPackmindError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}
