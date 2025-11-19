import OpenAI from 'openai';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { BaseOpenAIService } from './BaseOpenAIService';
import { OpenAICompatibleServiceConfig } from '../../types/LLMServiceConfig';

const origin = 'OpenAIAPICompatibleService';

/**
 * OpenAI API-compatible service for custom endpoints.
 * This service allows using OpenAI-compatible APIs from other providers
 * (e.g., Google Gemini, Azure OpenAI, local models) by specifying
 * a custom base URL, API key, and model names.
 *
 * @example
 * ```typescript
 * // Using with Google Gemini
 * const geminiService = new OpenAIAPICompatibleService({
 *   provider: 'openai-compatible',
 *   llmEndpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/',
 *   llmApiKey: process.env.GEMINI_API_KEY!,
 *   model: 'gemini-1.5-flash',
 *   fastestModel: 'gemini-1.5-flash-8b',
 * });
 *
 * const result = await geminiService.executePrompt('Hello world');
 * ```
 */
export class OpenAIAPICompatibleService extends BaseOpenAIService {
  protected readonly defaultModel: string;
  protected readonly defaultFastModel: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    config: OpenAICompatibleServiceConfig,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(logger, origin);
    this.baseUrl = config.llmEndpoint;
    this.apiKey = config.llmApiKey;
    this.defaultModel = config.model;
    this.defaultFastModel = config.fastestModel;
  }

  /**
   * Check if the service is properly configured and ready to use
   */
  async isConfigured(): Promise<boolean> {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Initialize the OpenAI client with custom base URL and API key
   */
  protected async initialize(): Promise<void> {
    if (this.initialized) return;

    this.logger.info('Initializing OpenAI-compatible client', {
      baseUrl: this.baseUrl,
    });

    try {
      if (!this.apiKey || this.apiKey.length === 0) {
        this.logger.warn('API key not provided - AI features will be disabled');
        this.initialized = true; // Mark as initialized but without client
        return;
      }

      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseUrl,
      });

      this.initialized = true;
      this.logger.info('OpenAI-compatible client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI-compatible client', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
