/**
 * A broken invariant: something the caller could not have caused and cannot
 * correct. Sibling to `DomainError` rather than a fifth `DomainErrorKind`,
 * because it differs on every column of the policy table — it answers 500,
 * logs at `error` with a stack, keeps its message away from the client, and is
 * the one failure the frontend retries.
 *
 * `DomainError` and `InternalError` are interfaces, not unions; each carries a
 * `kind`, and their `kind` values do not overlap. So a value satisfies at most
 * one of them and `isDomainError` rejects an internal error.
 *
 * Carrying a type rather than throwing a bare `Error` is what puts `context`
 * into the log as fields: Nest's `BaseExceptionFilter` logs a message and a
 * stack, so ids interpolated into a string are all a reader ever gets.
 */
export type InternalErrorKind = 'internal';

export interface InternalError {
  readonly kind: InternalErrorKind;
  readonly reason: string;
  readonly context?: Record<string, unknown>;
}

export function isInternalError(
  value: unknown,
): value is InternalError & Error {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    obj['kind'] === 'internal' &&
    typeof obj['reason'] === 'string' &&
    value instanceof Error
  );
}

/**
 * Base for a package's internal errors, in the same shape as
 * `UserAccessError`: a literal `reason` union and a typed `context` supplied
 * by named subclasses, so the throw site names the invariant and nothing else.
 *
 * The message is for the log and the developer reading it, never for the
 * client — the filter answers with Nest's generic 500 body.
 */
export class PackmindInternalError extends Error implements InternalError {
  readonly kind: InternalErrorKind = 'internal';
  readonly reason: string;
  readonly context: Record<string, unknown>;

  constructor(
    reason: string,
    context: Record<string, unknown>,
    message: string,
  ) {
    super(message);
    this.name = 'PackmindInternalError';
    this.reason = reason;
    this.context = context;
  }
}
