import OpenAI from 'openai';
import { Configuration } from '@packmind/node-utils';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { BaseOpenAIService } from './BaseOpenAIService';
import { OpenAIServiceConfig, LLMProvider } from '../../types/LLMServiceConfig';
import { DEFAULT_OPENAI_MODELS } from '../../constants/defaultModels';

const origin = 'OpenAIService';

export class OpenAIService extends BaseOpenAIService {
  protected readonly defaultModel: string;
  protected readonly defaultFastModel: string;

  constructor(
    config: OpenAIServiceConfig = { provider: LLMProvider.OPENAI },
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(logger, origin);
    this.defaultModel = config.model || DEFAULT_OPENAI_MODELS.model;
    this.defaultFastModel =
      config.fastestModel || DEFAULT_OPENAI_MODELS.fastestModel;
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
  protected async initialize(): Promise<void> {
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
}
