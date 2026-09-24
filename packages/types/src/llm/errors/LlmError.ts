import { DomainError, DomainErrorKind } from '../../errors';

export type LlmErrorReason = 'ai_not_configured' | 'model_listing_unsupported';

export type LlmErrorContext = {
  organizationId?: string;
  provider?: string;
};

/**
 * Base for the llm domain errors, in the same shape as `CommandsError`: the
 * `kind` decides the HTTP answer, the literal `reason` is what a client
 * branches on, and `context` carries the ids for the log instead of only
 * being interpolated into the message.
 */
export class LlmError extends Error implements DomainError {
  readonly kind: DomainErrorKind;
  readonly reason: LlmErrorReason;
  readonly context: LlmErrorContext;

  constructor(
    kind: DomainErrorKind,
    reason: LlmErrorReason,
    context: LlmErrorContext,
    message: string,
  ) {
    super(message);
    this.name = 'LlmError';
    this.kind = kind;
    this.reason = reason;
    this.context = context;
  }
}
