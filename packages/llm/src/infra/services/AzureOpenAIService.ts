import { AzureOpenAI } from 'openai';
import { Configuration } from '@packmind/node-utils';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { BaseOpenAIService } from './BaseOpenAIService';
import { AzureOpenAIServiceConfig } from '../../types/LLMServiceConfig';
import { DEFAULT_AZURE_OPENAI_API_VERSION } from '../../constants/defaultModels';

const origin = 'AzureOpenAIService';

/**
 * `defaultModel` / `defaultFastModel` hold Azure *deployment* names, not model
 * identifiers - see `AzureOpenAIServiceConfig` in `@packmind/types`.
 */
export class AzureOpenAIService extends BaseOpenAIService {
  protected readonly defaultModel: string;
  protected readonly defaultFastModel: string;
  private readonly apiVersion: string;
  private readonly configEndpoint?: string;
  private readonly configApiKey?: string;

  constructor(
    config: AzureOpenAIServiceConfig,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(origin, logger);
    this.defaultModel = config.model;
    this.defaultFastModel = config.fastestModel;
    this.configEndpoint = config.endpoint;
    this.configApiKey = config.apiKey;
    this.apiVersion = config.apiVersion || DEFAULT_AZURE_OPENAI_API_VERSION;
  }

  async isConfigured(): Promise<boolean> {
    try {
      const apiKey =
        this.configApiKey ||
        (await Configuration.getConfig('AZURE_OPENAI_API_KEY'));
      const endpoint =
        this.configEndpoint ||
        (await Configuration.getConfig('AZURE_OPENAI_ENDPOINT'));
      return !!apiKey && !!endpoint;
    } catch (error) {
      this.logger.debug('Failed to check Azure OpenAI configuration', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  protected async initialize(): Promise<void> {
    if (this.initialized) return;

    this.logger.info('Initializing Azure OpenAI client');

    try {
      const apiKey =
        this.configApiKey ||
        (await Configuration.getConfig('AZURE_OPENAI_API_KEY'));
      const endpoint =
        this.configEndpoint ||
        (await Configuration.getConfig('AZURE_OPENAI_ENDPOINT'));

      if (!apiKey || !endpoint) {
        this.logger.warn(
          'Azure OpenAI API key or endpoint not found in configuration - AI features will be disabled',
        );
        this.initialized = true; // Mark as initialized but without client
        return;
      }

      this.client = new AzureOpenAI({
        apiKey,
        endpoint,
        apiVersion: this.apiVersion,
      }) as unknown as import('openai').default;

      this.initialized = true;
      this.logger.info('Azure OpenAI client initialized successfully', {
        endpoint,
        apiVersion: this.apiVersion,
      });
    } catch (error) {
      this.logger.error('Failed to initialize Azure OpenAI client', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Always throws. Listing deployments requires the Azure Management API with
   * subscription ID and resource group information, which is not available
   * through the data plane API; deployment names must be configured by hand.
   */
  async getModels(): Promise<string[]> {
    this.logger.warn(
      'getModels called on AzureOpenAIService - method not implemented',
    );
    throw new Error(
      'Method not implemented for this Provider. Azure OpenAI deployment names must be configured manually from Azure Portal.',
    );
  }
}
