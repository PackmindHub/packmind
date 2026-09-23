import {
  LLM_UPSTREAM_ERROR_REASON_BY_TYPE,
  LlmUpstreamError,
} from './errors/LlmUpstreamError';

export interface AIPromptResult<T = string> {
  success: boolean;
  data: T | null;
  error?: string;
  attempts: number;
  model: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
}

export enum LLMModelPerformance {
  FAST = 'FAST',
  STANDARD = 'STANDARD',
}

export enum OpenAIServiceTier {
  AUTO = 'AUTO',
  DEFAULT = 'DEFAULT',
  FLEX = 'FLEX',
  SCALE = 'SCALE',
  PRIORITY = 'PRIORITY',
}

export interface AIPromptOptions {
  maxTokens?: number;
  temperature?: number;
  retryAttempts?: number;
  responseFormat?: AI_RESPONSE_FORMAT;
  performance?: LLMModelPerformance;
  service_tier?: OpenAIServiceTier;
}

export type AIServiceErrorType =
  | 'RATE_LIMIT'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'AUTHENTICATION_ERROR'
  | 'MAX_RETRIES_EXCEEDED';

export const AIServiceErrorTypes: Record<
  AIServiceErrorType,
  AIServiceErrorType
> = {
  RATE_LIMIT: 'RATE_LIMIT',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  MAX_RETRIES_EXCEEDED: 'MAX_RETRIES_EXCEEDED',
};

/**
 * An LLM provider failure, classified by the adapter that caught it rather
 * than by this class: `type` is the axis callers already branch on, `kind`
 * and `reason` are what `LlmUpstreamError` — and so `DomainExceptionFilter`
 * — need, derived from it below rather than threaded through every call
 * site.
 */
export class AIServiceError extends LlmUpstreamError {
  constructor(
    message: string,
    public readonly type: AIServiceErrorType,
    public readonly attempts: number,
    public readonly originalError?: Error,
  ) {
    super(
      type === 'RATE_LIMIT' ? 'upstream_rate_limited' : 'upstream_unavailable',
      LLM_UPSTREAM_ERROR_REASON_BY_TYPE[type],
      { attempts },
      message,
    );
    this.name = 'AIServiceError';
  }
}

export enum AI_RESPONSE_FORMAT {
  JSON_MODE,
  PLAIN_TEXT,
}

export type TokensUsed = {
  input: number;
  output: number;
  details?: TokensUsedByOperation[];
};

export type TokensUsedByOperation = {
  operation?: string;
  input: number;
  output: number;
};

export type PromptConversation = {
  role: PromptConversationRole;
  message: string;
};

export enum PromptConversationRole {
  USER = 'user',
  SYSTEM = 'system',
  ASSISTANT = 'assistant',
}
