/**
 * The `options` bag of the native `Error` constructor. Spelled out here
 * because the shared `lib` is `es2020`, which predates `ErrorOptions` and the
 * two-argument `Error` constructor.
 */
export type PackmindErrorOptions = {
  cause?: unknown;
};

/**
 * Sets `cause` the way the native constructor does — own, non-enumerable —
 * so a wrapped failure keeps its original error and stack without leaking
 * into anything that spreads or serialises the error.
 */
export function attachCause(
  error: Error,
  options: PackmindErrorOptions | undefined,
): void {
  if (options && 'cause' in options) {
    Object.defineProperty(error, 'cause', {
      value: options.cause,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }
}
