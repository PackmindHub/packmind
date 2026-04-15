/**
 * Base class for expected authentication errors.
 *
 * These represent legitimate user-facing outcomes (wrong password, rate limit
 * reached, etc.) — NOT application bugs. Callers (e.g. NestJS controllers,
 * exception filters) should log instances of this class at `warn` level
 * without stack traces, and map them to the appropriate HTTP response.
 */
export abstract class ExpectedAuthError extends Error {
  protected constructor(message: string, name: string) {
    super(message);
    this.name = name;
  }
}
