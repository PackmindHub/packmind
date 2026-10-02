import { PackmindInternalError } from '@packmind/types';

export type LinterExecutionInternalErrorReason = 'program_parse_failed';

export type LinterExecutionInternalErrorContext = {
  cause?: string;
};

export class LinterExecutionInternalError extends PackmindInternalError {
  constructor(
    reason: LinterExecutionInternalErrorReason,
    context: LinterExecutionInternalErrorContext,
    message: string,
  ) {
    super(reason, context, message);
    this.name = 'LinterExecutionInternalError';
  }
}
