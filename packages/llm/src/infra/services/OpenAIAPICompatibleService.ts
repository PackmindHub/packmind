import OpenAI from 'openai';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { BaseOpenAIService } from './BaseOpenAIService';
import { OpenAICompatibleServiceConfig } from '../../types/LLMServiceConfig';
import {
  AIPromptOptions,
  AIPromptResult,
  PromptConversation,
} from '@packmind/types';

const origin = 'OpenAIAPICompatibleService';

/**
 * For endpoints that speak the OpenAI wire format but have no provider of their
 * own here - local models and the like. Gemini and Azure OpenAI each have a
 * dedicated provider and config type, so use those instead.
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
    super(origin, logger);
    this.baseUrl = config.llmEndpoint;
    this.apiKey = config.llmApiKey;
    this.defaultModel = config.model;
    this.defaultFastModel = config.fastestModel;
  }

  /**
   * Some reasoning models (e.g., DeepSeek-R1, QwQ) wrap their reasoning in
   * <think>...</think> tags in the response body, which callers must not see.
   */
  private removeThinkingTags(content: string): string {
    return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  }

  async isConfigured(): Promise<boolean> {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  protected async initialize(): Promise<void> {
    if (this.initialized) return;

    this.logger.info('Initializing OpenAI-compatible client', {
      baseUrl: this.baseUrl,
    });

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
  }

  async executePrompt<T = string>(
    prompt: string,
    options: AIPromptOptions = {},
  ): Promise<AIPromptResult<T>> {
    const result = await super.executePrompt<T>(prompt, options);

    if (result.success && result.data && typeof result.data === 'string') {
      const cleanedData = this.removeThinkingTags(result.data);
      return {
        ...result,
        data: cleanedData as T,
      };
    }

    return result;
  }

  async executePromptWithHistory<T = string>(
    conversationHistory: PromptConversation[],
    options: AIPromptOptions = {},
  ): Promise<AIPromptResult<T>> {
    const result = await super.executePromptWithHistory<T>(
      conversationHistory,
      options,
    );

    if (result.success && result.data && typeof result.data === 'string') {
      const cleanedData = this.removeThinkingTags(result.data);
      return {
        ...result,
        data: cleanedData as T,
      };
    }

    return result;
  }

  async getModels(): Promise<string[]> {
    this.logger.info(
      'Fetching available models from OpenAI-compatible endpoint',
    );

    await this.initialize();

    if (!this.client) {
      this.logger.warn(
        'OpenAI-compatible client not available - returning empty array',
      );
      return [];
    }

    try {
      const modelsList = await this.client.models.list();
      const models: string[] = [];

      for await (const model of modelsList) {
        models.push(model.id);
      }

      this.logger.info('Successfully fetched OpenAI-compatible models', {
        count: models.length,
      });

      return models;
    } catch (error) {
      this.logger.error('Failed to fetch OpenAI-compatible models', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}
