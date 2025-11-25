import OpenAI from 'openai';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { BaseOpenAIService } from './BaseOpenAIService';
import { OpenAIServiceConfig } from '../../types/LLMServiceConfig';
import { DEFAULT_OPENAI_MODELS } from '../../constants/defaultModels';
import {
  AIPromptOptions,
  AIPromptResult,
  AIServiceError,
  AIServiceErrorTypes,
  PromptConversation,
} from '@packmind/types';

const origin = 'OpenAIService';

type ServiceTierType = 'auto' | 'default' | 'flex' | 'scale' | 'priority';

export class OpenAIService extends BaseOpenAIService {
  protected readonly defaultModel: string;
  protected readonly defaultFastModel: string;
  private readonly apiKey: string;

  constructor(
    config: OpenAIServiceConfig,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(logger, origin);
    this.apiKey = config.apiKey;
    this.defaultModel = config.model || DEFAULT_OPENAI_MODELS.model;
    this.defaultFastModel =
      config.fastestModel || DEFAULT_OPENAI_MODELS.fastestModel;
  }

  /**
   * Check if the OpenAI service is properly configured and ready to use
   */
  async isConfigured(): Promise<boolean> {
    return !!this.apiKey;
  }

  /**
   * Initialize the OpenAI client with the injected API key
   */
  protected async initialize(): Promise<void> {
    if (this.initialized) return;

    this.logger.info('Initializing OpenAI client');

    if (!this.apiKey) {
      this.logger.warn(
        'OpenAI API key not provided - AI features will be disabled',
      );
      this.initialized = true; // Mark as initialized but without client
      return;
    }

    this.client = new OpenAI({
      apiKey: this.apiKey,
    });

    this.initialized = true;
    this.logger.info('OpenAI client initialized successfully');
  }

  /**
   * Get the service tier from options (OpenAI-specific)
   */
  private getServiceTier(options: AIPromptOptions): ServiceTierType {
    if (options.service_tier) {
      const tier = options.service_tier.toLowerCase();
      return tier as ServiceTierType;
    }

    return 'auto';
  }

  /**
   * Execute a prompt with OpenAI-specific service_tier support
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

        const serviceTier = this.getServiceTier(options);

        this.logger.info(`Sending request to ${this.serviceName}`, {
          attempt,
          model,
          service_tier: serviceTier,
          promptLength: prompt.length,
        });

        const response = await this.client.chat.completions.create({
          model,
          service_tier: serviceTier,
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
   * Execute a prompt with conversation history and OpenAI-specific service_tier support
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

        const serviceTier = this.getServiceTier(options);

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
            service_tier: serviceTier,
            messageCount: messages.length,
          },
        );

        const response = await this.client.chat.completions.create({
          model,
          service_tier: serviceTier,
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
   * Get a list of available model IDs from OpenAI
   */
  async getModels(): Promise<string[]> {
    this.logger.info('Fetching available models from OpenAI');

    await this.initialize();

    if (!this.client) {
      this.logger.warn('OpenAI client not available - returning empty array');
      return [];
    }

    try {
      const modelsList = await this.client.models.list();
      const models: string[] = [];

      for await (const model of modelsList) {
        models.push(model.id);
      }

      this.logger.info('Successfully fetched OpenAI models', {
        count: models.length,
      });

      return models;
    } catch (error) {
      this.logger.error('Failed to fetch OpenAI models', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}
