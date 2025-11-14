import OpenAI from 'openai';
import { Configuration } from '../../config/config/Configuration';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  AIPromptResult,
  AIPromptOptions,
  AIServiceError,
  AIServiceErrorType,
  AIServiceErrorTypes,
  PromptConversation,
  PromptConversationRole,
} from './types';
import { AIService } from './AIService';

const origin = 'OpenAIService';

export class OpenAIService implements AIService {
  private client: OpenAI | null = null;
  private readonly defaultModel = 'gpt-5-mini';
  private readonly defaultFastModel = 'gpt-5-nano';
  private readonly maxRetries = 5;
  private initialized = false;

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OpenAIService initialized');
  }

  /**
   * Check if the OpenAI service is properly configured and ready to use
   */
  async isConfigured(): Promise<boolean> {
    try {
      const apiKey = await Configuration.getConfig('OPENAI_API_KEY');
      return !!apiKey;
    } catch (error) {
      this.logger.debug('Failed to check OpenAI configuration', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Initialize the OpenAI client with API key from configuration
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    this.logger.info('Initializing OpenAI client');

    try {
      const apiKey = await Configuration.getConfig('OPENAI_API_KEY');

      if (!apiKey) {
        this.logger.warn(
          'OpenAI API key not found in configuration - AI features will be disabled',
        );
        this.initialized = true; // Mark as initialized but without client
        return;
      }

      this.client = new OpenAI({
        apiKey,
      });

      this.initialized = true;
      this.logger.info('OpenAI client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI client', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute a prompt with retry mechanism and return typed result
   */
  async executePrompt<T = string>(
    prompt: string,
    options: AIPromptOptions = {},
  ): Promise<AIPromptResult<T>> {
    this.logger.info('Executing AI prompt', {
      promptLength: prompt.length,
      maxTokens: options.maxTokens,
    });

    await this.initialize();

    // Return graceful failure if no client is available (missing API key)
    if (!this.client) {
      this.logger.warn(
        'OpenAI client not available - returning graceful failure',
      );
      return {
        success: false,
        data: null,
        error: 'OpenAI API key not configured',
        attempts: 1,
        model: this.defaultModel,
      };
    }

    const maxRetries = options.retryAttempts ?? this.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.client) {
          throw new AIServiceError(
            'OpenAI client not initialized',
            AIServiceErrorTypes.API_ERROR,
            attempt,
          );
        }

        const model =
          options.performance === 'fast'
            ? this.defaultFastModel
            : this.defaultModel;

        this.logger.info('Sending request to OpenAI', {
          attempt,
          model,
          promptLength: prompt.length,
        });

        const response = await this.client.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const content = response.choices[0]?.message?.content;

        if (!content) {
          throw new AIServiceError(
            'Invalid response from OpenAI: no content returned',
            AIServiceErrorTypes.INVALID_RESPONSE,
            attempt,
          );
        }

        this.logger.info('AI prompt executed successfully', {
          attempt,
          responseLength: content.length,
          tokensUsed: response.usage?.total_tokens,
        });

        // Try to parse as JSON if T is not string, otherwise return as string
        let parsedData: T;
        try {
          // If the generic type T is expected to be an object, try to parse JSON
          parsedData =
            typeof content === 'string' && content.trim().startsWith('{')
              ? (JSON.parse(content) as T)
              : (content as T);
        } catch {
          // If JSON parsing fails, return as string type
          parsedData = content as T;
        }

        return {
          success: true,
          data: parsedData,
          attempts: attempt,
          model: this.defaultModel,
          tokensUsed: response.usage
            ? {
                input: response.usage.prompt_tokens,
                output: response.usage.completion_tokens,
              }
            : undefined,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const errorType = this.classifyError(error);
        const shouldRetry = this.shouldRetry(errorType, attempt, maxRetries);

        this.logger.warn('AI prompt execution failed', {
          attempt,
          error: lastError.message,
          errorType,
          willRetry: shouldRetry,
        });

        if (!shouldRetry) {
          break;
        }

        this.logger.debug('Retrying immediately', { attempt });
      }
    }

    const finalError = new AIServiceError(
      `AI prompt execution failed after ${maxRetries} attempts: ${lastError?.message}`,
      AIServiceErrorTypes.MAX_RETRIES_EXCEEDED,
      maxRetries,
      lastError || undefined,
    );

    this.logger.error('AI prompt execution failed permanently', {
      maxRetries,
      finalError: finalError.message,
    });

    return {
      success: false,
      data: null,
      error: finalError.message,
      attempts: maxRetries,
      model: this.defaultModel,
    };
  }

  /**
   * Execute a prompt with conversation history
   */
  async executePromptWithHistory<T = string>(
    conversationHistory: PromptConversation[],
    options: AIPromptOptions = {},
  ): Promise<AIPromptResult<T>> {
    this.logger.info('Executing AI prompt with history', {
      conversationLength: conversationHistory.length,
      maxTokens: options.maxTokens,
    });

    await this.initialize();

    // Return graceful failure if no client is available (missing API key)
    if (!this.client) {
      this.logger.warn(
        'OpenAI client not available - returning graceful failure',
      );
      return {
        success: false,
        data: null,
        error: 'OpenAI API key not configured',
        attempts: 1,
        model: this.defaultModel,
      };
    }

    const maxRetries = options.retryAttempts ?? this.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.client) {
          throw new AIServiceError(
            'OpenAI client not initialized',
            AIServiceErrorTypes.API_ERROR,
            attempt,
          );
        }

        // Convert PromptConversation to OpenAI message format
        const messages = conversationHistory.map((conv) => ({
          role: this.mapRoleToOpenAI(conv.role),
          content: conv.message,
        }));

        this.logger.info('Sending request to OpenAI with history', {
          attempt,
          model: this.defaultModel,
          messageCount: messages.length,
        });

        const response = await this.client.chat.completions.create({
          model: this.defaultModel,
          messages,
        });

        const content = response.choices[0]?.message?.content;

        if (!content) {
          throw new AIServiceError(
            'Invalid response from OpenAI: no content returned',
            AIServiceErrorTypes.INVALID_RESPONSE,
            attempt,
          );
        }

        this.logger.info('AI prompt with history executed successfully', {
          attempt,
          responseLength: content.length,
          tokensUsed: response.usage?.total_tokens,
        });

        // Try to parse as JSON if T is not string, otherwise return as string
        let parsedData: T;
        try {
          // If the generic type T is expected to be an object, try to parse JSON
          parsedData =
            typeof content === 'string' && content.trim().startsWith('{')
              ? (JSON.parse(content) as T)
              : (content as T);
        } catch {
          // If JSON parsing fails, return as string type
          parsedData = content as T;
        }

        return {
          success: true,
          data: parsedData,
          attempts: attempt,
          model: this.defaultModel,
          tokensUsed: response.usage
            ? {
                input: response.usage.prompt_tokens,
                output: response.usage.completion_tokens,
              }
            : undefined,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const errorType = this.classifyError(error);
        const shouldRetry = this.shouldRetry(errorType, attempt, maxRetries);

        this.logger.warn('AI prompt with history execution failed', {
          attempt,
          error: lastError.message,
          errorType,
          willRetry: shouldRetry,
        });

        if (!shouldRetry) {
          break;
        }

        this.logger.debug('Retrying immediately', { attempt });
      }
    }

    const finalError = new AIServiceError(
      `AI prompt with history execution failed after ${maxRetries} attempts: ${lastError?.message}`,
      AIServiceErrorTypes.MAX_RETRIES_EXCEEDED,
      maxRetries,
      lastError || undefined,
    );

    this.logger.error('AI prompt with history execution failed permanently', {
      maxRetries,
      finalError: finalError.message,
    });

    return {
      success: false,
      data: null,
      error: finalError.message,
      attempts: maxRetries,
      model: this.defaultModel,
    };
  }

  /**
   * Map PromptConversationRole to OpenAI role format
   */
  private mapRoleToOpenAI(
    role: PromptConversationRole,
  ): 'user' | 'assistant' | 'system' {
    switch (role) {
      case PromptConversationRole.USER:
        return 'user';
      case PromptConversationRole.ASSISTANT:
        return 'assistant';
      case PromptConversationRole.SYSTEM:
        return 'system';
      default:
        return 'user';
    }
  }

  /**
   * Classify error type for retry logic
   */
  private classifyError(error: unknown): AIServiceErrorType {
    if (error instanceof AIServiceError) {
      return error.type;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    if (lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
      return AIServiceErrorTypes.RATE_LIMIT;
    }

    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
      return AIServiceErrorTypes.AUTHENTICATION_ERROR;
    }

    if (lowerMessage.includes('network') || lowerMessage.includes('timeout')) {
      return AIServiceErrorTypes.NETWORK_ERROR;
    }

    return AIServiceErrorTypes.API_ERROR;
  }

  /**
   * Determine if we should retry based on error type and attempt number
   */
  private shouldRetry(
    errorType: AIServiceErrorType,
    attempt: number,
    maxRetries: number,
  ): boolean {
    if (attempt >= maxRetries) {
      return false;
    }

    // Don't retry authentication errors
    if (errorType === AIServiceErrorTypes.AUTHENTICATION_ERROR) {
      return false;
    }

    // Retry rate limits, network errors, and general API errors
    return [
      AIServiceErrorTypes.RATE_LIMIT,
      AIServiceErrorTypes.NETWORK_ERROR,
      AIServiceErrorTypes.API_ERROR,
    ].includes(errorType);
  }
}
