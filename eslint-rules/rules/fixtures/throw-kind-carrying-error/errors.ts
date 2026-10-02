export type DomainErrorKind =
  | 'forbidden'
  | 'not_found'
  | 'invalid_input'
  | 'conflict';

export class PackageError extends Error {
  constructor(
    readonly kind: DomainErrorKind,
    readonly reason: 'package_not_found' | 'package_slug_taken',
    message: string,
  ) {
    super(message);
  }
}

export class PackageNotFoundError extends PackageError {
  constructor() {
    super('not_found', 'package_not_found', 'This package does not exist.');
  }
}

export class PackmindInternalError extends Error {
  readonly kind = 'internal' as const;
  constructor(
    readonly reason: string,
    message: string,
  ) {
    super(message);
  }
}

export class TooManyAttemptsError extends Error {
  readonly kind = 'rate_limited' as const;
  readonly reason: string = 'too_many_attempts';
}

export abstract class ExpectedAuthError extends Error {}

export class InvalidPasswordError extends ExpectedAuthError {}

export class StringKindError extends Error {
  readonly kind: string = 'not_found';
  readonly reason = 'loose';
}

export class UnknownKindError extends Error {
  readonly kind = 'teapot' as const;
  readonly reason = 'teapot';
}

export class KindWithoutReasonError extends Error {
  readonly kind = 'not_found' as const;
}

export class NullableKindError extends Error {
  readonly kind: DomainErrorKind | null = 'not_found';
  readonly reason = 'nullable';
}

export class OptionalKindError extends Error {
  readonly kind?: DomainErrorKind;
  readonly reason = 'optional';
}

export class NumericReasonError extends Error {
  readonly kind = 'not_found' as const;
  readonly reason: number = 404;
}

export class OptionalReasonError extends Error {
  readonly kind = 'not_found' as const;
  readonly reason?: string;
}

export class NullableReasonError extends Error {
  readonly kind = 'not_found' as const;
  readonly reason: string | null = null;
}

export interface InternalErrorShape {
  readonly kind: 'internal';
  readonly reason: string;
}

export interface DomainErrorShape {
  readonly kind: DomainErrorKind;
  readonly reason: string;
}
