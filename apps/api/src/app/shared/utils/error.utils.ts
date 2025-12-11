/**
 * Extracts an error message from an unknown error type.
 *
 * In strict mode, caught errors are of type 'unknown' rather than 'any'.
 * This utility safely extracts a string message from various error types.
 *
 * @param error - The caught error of unknown type
 * @returns A string representation of the error message
 *
 * @example
 * ```typescript
 * try {
 *   await someAsyncOperation();
 * } catch (error) {
 *   logger.error('Operation failed', { error: getErrorMessage(error) });
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return String(error);
}
