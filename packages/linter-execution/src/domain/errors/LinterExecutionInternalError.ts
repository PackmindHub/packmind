import { PackmindErrorOptions, PackmindInternalError } from '@packmind/types';

export type LinterExecutionInternalErrorReason = 'program_parse_failed';

export type LinterExecutionInternalErrorContext = Record<string, never>;

export class LinterExecutionInternalError extends PackmindInternalError {
  constructor(
    reason: LinterExecutionInternalErrorReason,
    context: LinterExecutionInternalErrorContext,
    message: string,
    options?: PackmindErrorOptions,
  ) {
    super(reason, context, message, options);
    this.name = 'LinterExecutionInternalError';
  }
}
