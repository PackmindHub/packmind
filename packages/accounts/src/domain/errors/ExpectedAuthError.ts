/**
 * Base class for expected authentication errors that no `kind` can answer yet.
 *
 * Only `TooManyLoginAttemptsError` is left: it must answer 429 with
 * `bannedUntil` in the body, which `DomainExceptionFilter` cannot produce, so
 * the sign-in controller still maps it by hand and logs it at `warn`.
 */
export abstract class ExpectedAuthError extends Error {
  protected constructor(message: string, name: string) {
    super(message);
    this.name = name;
  }
}
