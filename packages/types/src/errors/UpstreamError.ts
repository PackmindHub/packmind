/**
 * A failure owned by neither party to the call: a third-party service we
 * depend on — GitHub, GitLab — refused us or did not answer. Sibling to
 * `DomainError` and `InternalError` rather than a member of either, for the
 * same reason `InternalError` is a sibling: it differs on every column of the
 * policy table.
 *
 * The three interfaces partition failures by *fault*: the caller
 * (`DomainError`), us (`InternalError`), a third party (this one). Fault is
 * the axis, not the HTTP status class — which is why
 * `upstream_rate_limited` answers 429, a 4xx, and is still not a
 * `DomainErrorKind`. `DomainErrorKind` promises its members are "failure modes
 * a caller can provoke and correct" that are "never retried by the client",
 * and a rate limit is neither: the caller did not misuse the API, our shared
 * credential hit someone else's quota, and waiting is precisely the remedy.
 *
 * Without this type an upstream outage was answered with a 500 and a stack
 * logged at `error` — blaming ourselves for someone else's downtime, and
 * spending the signal a 500 is supposed to carry.
 *
 * `DomainError`, `InternalError` and `UpstreamError` are interfaces, not
 * unions; each carries a `kind`, and their `kind` values do not overlap. So a
 * value satisfies at most one of the three guards.
 *
 * - `upstream_unavailable`: we asked an upstream and did not get a usable
 *   answer. It answers **502, not 503**: 503 says *we* are unavailable, while
 *   502 says the thing behind us is, which is what actually happened. It is
 *   also the bucket for an upstream refusal we do not model yet (GitHub's 422
 *   on a protected branch, say) — imperfect, but far better than a 500 with a
 *   stack.
 * - `upstream_rate_limited`: the provider told us to slow down. Answers 429 and
 *   carries `retryAfterSeconds` when the provider said how long.
 */
export type UpstreamErrorKind =
  | 'upstream_unavailable'
  | 'upstream_rate_limited';

export interface UpstreamError {
  readonly kind: UpstreamErrorKind;
  readonly reason: string;
  readonly context?: Record<string, unknown>;
  /** Seconds the caller should wait, when the provider told us. */
  readonly retryAfterSeconds?: number;
}

const VALID_KINDS = [
  'upstream_unavailable',
  'upstream_rate_limited',
] as const satisfies readonly UpstreamErrorKind[];

export function isUpstreamError(
  value: unknown,
): value is UpstreamError & Error {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    VALID_KINDS.includes(obj['kind'] as UpstreamErrorKind) &&
    typeof obj['reason'] === 'string' &&
    value instanceof Error
  );
}

/**
 * Base for a package's upstream errors, in the same shape as
 * `PackmindInternalError`: a package subclasses it with a literal `reason`
 * union and a typed `context`, so the throw site names which provider failed
 * and how.
 *
 * Unlike `PackmindInternalError`, the message *is* returned to the caller —
 * "GitHub is rate limiting us, try again shortly" is exactly what the user
 * needs to read, and it discloses nothing about our internals. Ids still
 * belong in `context`, which stays in the log.
 */
export class PackmindUpstreamError extends Error implements UpstreamError {
  readonly kind: UpstreamErrorKind;
  readonly reason: string;
  readonly context: Record<string, unknown>;
  readonly retryAfterSeconds?: number;

  constructor(
    kind: UpstreamErrorKind,
    reason: string,
    context: Record<string, unknown>,
    message: string,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'PackmindUpstreamError';
    this.kind = kind;
    this.reason = reason;
    this.context = context;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
