/**
 * Generic result type for AI prompt execution
 * Supports both string and object responses as specified in user story
 */
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

/**
 * Configuration options for AI prompts
 */
export interface AIPromptOptions {
  maxTokens?: number;
  temperature?: number;
  retryAttempts?: number;
  responseFormat?: AI_RESPONSE_FORMAT;
  performance?: LLMModelPerformance;
}

/**
 * Error types that can occur during AI service operations
 */

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

export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly type: AIServiceErrorType,
    public readonly attempts: number,
    public readonly originalError?: Error,
  ) {
    super(message);
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
