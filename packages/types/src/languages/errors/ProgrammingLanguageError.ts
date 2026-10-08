import { DomainError, DomainErrorKind } from '../../errors';

export type ProgrammingLanguageErrorReason =
  | 'empty_programming_language'
  | 'unknown_programming_language';

export type ProgrammingLanguageErrorContext = {
  input?: string;
};

/**
 * Base for a language name that does not resolve, in the same shape as
 * `GitError`. Every caller parses a language a user typed — a request body or
 * a CLI config — so its subclasses are domain errors.
 */
export class ProgrammingLanguageError extends Error implements DomainError {
  readonly kind: DomainErrorKind;
  readonly reason: ProgrammingLanguageErrorReason;
  readonly context: ProgrammingLanguageErrorContext;

  constructor(
    kind: DomainErrorKind,
    reason: ProgrammingLanguageErrorReason,
    context: ProgrammingLanguageErrorContext,
    message: string,
  ) {
    super(message);
    this.name = 'ProgrammingLanguageError';
    this.kind = kind;
    this.reason = reason;
    this.context = context;
  }
}
