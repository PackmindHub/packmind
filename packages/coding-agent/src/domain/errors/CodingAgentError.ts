import { DomainError, DomainErrorKind } from '@packmind/types';

export type CodingAgentErrorReason = 'unknown_coding_agent';

export type CodingAgentErrorContext = {
  codingAgent?: string;
};

/**
 * Base for the coding agent domain errors, in the same shape as `SpacesError`:
 * the `kind` decides the HTTP answer, the literal `reason` is what a client
 * branches on, and `context` carries the ids for the log instead of only
 * being interpolated into the message.
 */
export class CodingAgentError extends Error implements DomainError {
  readonly kind: DomainErrorKind;
  readonly reason: CodingAgentErrorReason;
  readonly context: CodingAgentErrorContext;

  constructor(
    kind: DomainErrorKind,
    reason: CodingAgentErrorReason,
    context: CodingAgentErrorContext,
    message: string,
  ) {
    super(message);
    this.name = 'CodingAgentError';
    this.kind = kind;
    this.reason = reason;
    this.context = context;
  }
}
