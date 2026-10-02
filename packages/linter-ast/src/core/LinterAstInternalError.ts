import { PackmindInternalError } from '@packmind/types';

export type LinterAstInternalErrorReason =
  | 'parser_not_available'
  | 'console_removal_language_unsupported'
  | 'console_removal_parse_failed';

export type LinterAstInternalErrorContext = {
  language?: string;
  cause?: string;
};

/**
 * Base for the linter-ast broken invariants. Callers only ever ask for a
 * language they checked first, so a miss here is our bug, not the caller's.
 */
export class LinterAstInternalError extends PackmindInternalError {
  constructor(
    reason: LinterAstInternalErrorReason,
    context: LinterAstInternalErrorContext,
    message: string,
  ) {
    super(reason, context, message);
    this.name = 'LinterAstInternalError';
  }
}
