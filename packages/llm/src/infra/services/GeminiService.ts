import { GoogleGenAI } from '@google/genai';
import { LogLevel, PackmindLogger } from '@packmind/logger';
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
import { GeminiServiceConfig } from '../../types/LLMServiceConfig';
import { DEFAULT_GEMINI_MODELS } from '../../constants/defaultModels';

const origin = 'GeminiService';

export class GeminiService implements AIService {
  private client: GoogleGenAI | null = null;
  private readonly defaultModel: string;
  private readonly defaultFastModel: string;
  private readonly maxRetries = 5;
  private initialized = false;
  private readonly apiKey: string;

  constructor(
    config: GeminiServiceConfig,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.model || DEFAULT_GEMINI_MODELS.model;
    this.defaultFastModel =
      config.fastestModel || DEFAULT_GEMINI_MODELS.fastestModel;
    this.logger.info('GeminiService initialized');
  }

  /**
   * Check if the Gemini service is properly configured and ready to use
   */
  async isConfigured(): Promise<boolean> {
    return !!this.apiKey;
  }

  /**
   * Initialize the Gemini client with the injected API key
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    this.logger.info('Initializing Gemini client');

    if (!this.apiKey) {
      this.logger.warn(
        'Gemini API key not provided - AI features will be disabled',
      );
      this.initialized = true; // Mark as initialized but without client
      return;
    }

    this.client = new GoogleGenAI({ apiKey: this.apiKey });

    this.initialized = true;
    this.logger.info('Gemini client initialized successfully');
  }

  private getModel(options: AIPromptOptions): string {
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
    });

    await this.initialize();

    const model = this.getModel(options);

    // Return graceful failure if no client is available (missing API key)
    if (!this.client) {
      this.logger.warn(
        'Gemini client not available - returning graceful failure',
      );
      return {
        success: false,
        data: null,
        error: 'Gemini API key not configured',
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
            'Gemini client not initialized',
            AIServiceErrorTypes.API_ERROR,
            attempt,
          );
        }

        const modelName = this.getModel(options);

        this.logger.info('Sending request to Gemini', {
          attempt,
          model: modelName,
          promptLength: prompt.length,
        });

        const result = await this.client.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const content = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
          throw new AIServiceError(
            'Invalid response from Gemini: no text content returned',
            AIServiceErrorTypes.INVALID_RESPONSE,
            attempt,
          );
        }

        this.logger.info('AI prompt executed successfully', {
          attempt,
          responseLength: content.length,
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
          model: modelName,
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
    });

    await this.initialize();

    const model = this.getModel(options);

    // Return graceful failure if no client is available (missing API key)
    if (!this.client) {
      this.logger.warn(
        'Gemini client not available - returning graceful failure',
      );
      return {
        success: false,
        data: null,
        error: 'Gemini API key not configured',
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
            'Gemini client not initialized',
            AIServiceErrorTypes.API_ERROR,
            attempt,
          );
        }

        const modelName = this.getModel(options);

        // Convert PromptConversation to Gemini format
        const contents = conversationHistory.map((conv) => ({
          role: this.mapRoleToGemini(conv.role),
          parts: [{ text: conv.message }],
        }));

        this.logger.info('Sending request to Gemini with history', {
          attempt,
          model: modelName,
          messageCount: conversationHistory.length,
        });

        const result = await this.client.models.generateContent({
          model: modelName,
          contents,
        });

        const content = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
          throw new AIServiceError(
            'Invalid response from Gemini: no text content returned',
            AIServiceErrorTypes.INVALID_RESPONSE,
            attempt,
          );
        }

        this.logger.info('AI prompt with history executed successfully', {
          attempt,
          responseLength: content.length,
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
          model: modelName,
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
   * Map PromptConversationRole to Gemini role format
   */
  private mapRoleToGemini(role: PromptConversationRole): 'user' | 'model' {
    switch (role) {
      case PromptConversationRole.USER:
        return 'user';
      case PromptConversationRole.ASSISTANT:
        return 'model';
      case PromptConversationRole.SYSTEM:
        // Gemini doesn't have a separate system role, map to user
        return 'user';
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
