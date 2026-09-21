/**
 * The failure modes a caller can provoke and correct: each one names a 4xx
 * answer, is safe to show the user, and is never retried by the client.
 *
 * A failure that is *our* fault does not belong here — it is an
 * `InternalError`, which answers 500 and hides its message. See the table in
 * `.packmind/standards/domain-error-handling.md`.
 *
 * - `not_found`: the addressed resource does not exist, or exists somewhere
 *   the caller cannot see. Reads that cross a tenant boundary answer this
 *   rather than `forbidden`, so a 403 never confirms the resource exists.
 * - `forbidden`: the resource is acknowledged and the caller may not act on
 *   it — the caller's rights are themselves the subject.
 * - `invalid_input`: the command is malformed on its face, independently of
 *   any stored state.
 * - `conflict`: the command is well-formed, but the current state of the
 *   resource forbids it — a duplicate, or an operation the resource's role
 *   rules out.
 */
export type DomainErrorKind =
  | 'forbidden'
  | 'not_found'
  | 'invalid_input'
  | 'conflict';

export interface DomainError {
  readonly kind: DomainErrorKind;
  readonly reason: string;
}

const VALID_KINDS = [
  'forbidden',
  'not_found',
  'invalid_input',
  'conflict',
] as const satisfies readonly DomainErrorKind[];

export function isDomainError(value: unknown): value is DomainError {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (!('kind' in obj) || !('reason' in obj)) {
    return false;
  }

  return (
    VALID_KINDS.includes(obj['kind'] as DomainErrorKind) &&
    typeof obj['reason'] === 'string'
  );
}
