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
