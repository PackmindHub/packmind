import OpenAI from 'openai';
import { PackmindLogger } from '@packmind/logger';
import {
  AIPromptOptions,
  AIPromptResult,
  AIServiceError,
  AIServiceErrorType,
  AIServiceErrorTypes,
  LLMModelPerformance,
  PromptConversation,
  PromptConversationRole,
  AIService,
} from '@packmind/types';

/**
 * Abstract base class for OpenAI and OpenAI-compatible services.
 * Provides shared logic for executing prompts, retry mechanisms, and error handling.
 */
export abstract class BaseOpenAIService implements AIService {
  protected client: OpenAI | null = null;
  protected readonly maxRetries = 5;
  protected initialized = false;

  /**
   * Abstract properties that must be defined by subclasses
   */
  protected abstract readonly defaultModel: string;
  protected abstract readonly defaultFastModel: string;

  constructor(
    protected readonly logger: PackmindLogger,
    protected readonly serviceName: string,
  ) {
    this.logger.info(`${this.serviceName} initialized`);
  }

  /**
   * Check if the service is properly configured and ready to use.
   * Must be implemented by subclasses with their specific configuration checks.
   */
  abstract isConfigured(): Promise<boolean>;

  /**
   * Initialize the OpenAI client with service-specific configuration.
   * Must be implemented by subclasses with their specific initialization logic.
   */
  protected abstract initialize(): Promise<void>;

  /**
   * Get a list of available model IDs for this provider.
   * Must be implemented by subclasses with their provider-specific model listing logic.
   */
  abstract getModels(): Promise<string[]>;

  /**
   * Get the appropriate model based on performance options
   */
  protected getModel(options: AIPromptOptions): string {
    return options.performance === LLMModelPerformance.FAST
      ? this.defaultFastModel
      : this.defaultModel;
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

    const model = this.getModel(options);

    // Return graceful failure if no client is available (missing API key)
    if (!this.client) {
      this.logger.warn(
        `${this.serviceName} client not available - returning graceful failure`,
      );
      return {
        success: false,
        data: null,
        error: `${this.serviceName} not configured`,
        attempts: 1,
        model,
      };
    }

    const maxRetries = options.retryAttempts ?? this.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.client) {
          throw new AIServiceError(
            `${this.serviceName} client not initialized`,
            AIServiceErrorTypes.API_ERROR,
            attempt,
          );
        }

        const model = this.getModel(options);

        this.logger.info(`Sending request to ${this.serviceName}`, {
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
            `Invalid response from ${this.serviceName}: no content returned`,
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
          model,
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
      model,
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

    const model = this.getModel(options);

    // Return graceful failure if no client is available (missing API key)
    if (!this.client) {
      this.logger.warn(
        `${this.serviceName} client not available - returning graceful failure`,
      );
      return {
        success: false,
        data: null,
        error: `${this.serviceName} not configured`,
        attempts: 1,
        model,
      };
    }

    const maxRetries = options.retryAttempts ?? this.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.client) {
          throw new AIServiceError(
            `${this.serviceName} client not initialized`,
            AIServiceErrorTypes.API_ERROR,
            attempt,
          );
        }

        // Convert PromptConversation to OpenAI message format
        const messages = conversationHistory.map((conv) => ({
          role: this.mapRoleToOpenAI(conv.role),
          content: conv.message,
        }));

        this.logger.info(
          `Sending request to ${this.serviceName} with history`,
          {
            attempt,
            model,
            messageCount: messages.length,
          },
        );

        const response = await this.client.chat.completions.create({
          model,
          messages,
        });

        const content = response.choices[0]?.message?.content;

        if (!content) {
          throw new AIServiceError(
            `Invalid response from ${this.serviceName}: no content returned`,
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
          model,
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
      model,
    };
  }

  /**
   * Map PromptConversationRole to OpenAI role format
   */
  protected mapRoleToOpenAI(
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
  protected classifyError(error: unknown): AIServiceErrorType {
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
  protected shouldRetry(
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
