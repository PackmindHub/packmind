export type DomainErrorKind = 'forbidden' | 'not_found';

export interface DomainError {
  readonly kind: DomainErrorKind;
  readonly reason: string;
}

const VALID_KINDS = [
  'forbidden',
  'not_found',
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
