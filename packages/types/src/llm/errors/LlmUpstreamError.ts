import { PackmindUpstreamError, UpstreamErrorKind } from '../../errors';
// Type-only: erased at compile time, so this does not create a runtime
// circular dependency with `AIServiceTypes.ts`, which imports this file's
// values to build `AIServiceError`.
import type { AIServiceErrorType } from '../AIServiceTypes';

export type LlmUpstreamErrorReason =
  | 'llm_rate_limited'
  | 'llm_api_error'
  | 'llm_network_error'
  | 'llm_invalid_response'
  | 'llm_authentication_failed'
  | 'llm_max_retries_exceeded';

export type LlmUpstreamErrorContext = {
  organizationId?: string;
  provider?: string;
  model?: string;
  attempts?: number;
  status?: number;
};

/**
 * Maps an `AIServiceErrorType`, the classification a provider adapter
 * already computes, to the `reason` this family exposes to the filter. Kept
 * here, next to `LlmUpstreamErrorReason`, so `AIServiceError` can derive its
 * `reason` without `LlmUpstreamError` importing back from `AIServiceTypes`.
 */
export const LLM_UPSTREAM_ERROR_REASON_BY_TYPE: Record<
  AIServiceErrorType,
  LlmUpstreamErrorReason
> = {
  RATE_LIMIT: 'llm_rate_limited',
  API_ERROR: 'llm_api_error',
  NETWORK_ERROR: 'llm_network_error',
  INVALID_RESPONSE: 'llm_invalid_response',
  AUTHENTICATION_ERROR: 'llm_authentication_failed',
  MAX_RETRIES_EXCEEDED: 'llm_max_retries_exceeded',
};

/**
 * Base for the llm failures that belong to the provider rather than to us:
 * OpenAI, Anthropic or another vendor refused, went away, or handed back
 * something we cannot read. Same shape as `GitUpstreamError` — a literal
 * `reason` union and a typed `context` — plus the `kind` the sibling base
 * needs, because an upstream failure is either unavailable (502) or a
 * throttle (429), and `retryAfterSeconds` when the provider said how long to
 * wait.
 */
export class LlmUpstreamError extends PackmindUpstreamError {
  constructor(
    kind: UpstreamErrorKind,
    reason: LlmUpstreamErrorReason,
    context: LlmUpstreamErrorContext,
    message: string,
    retryAfterSeconds?: number,
  ) {
    super(kind, reason, context, message, retryAfterSeconds);
    this.name = 'LlmUpstreamError';
  }
}
