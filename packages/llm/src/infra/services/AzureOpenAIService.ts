import { AzureOpenAI } from 'openai';
import { Configuration } from '@packmind/node-utils';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { BaseOpenAIService } from './BaseOpenAIService';
import { AzureOpenAIServiceConfig } from '../../types/LLMServiceConfig';
import { DEFAULT_AZURE_OPENAI_API_VERSION } from '../../constants/defaultModels';

const origin = 'AzureOpenAIService';

/**
 * Azure OpenAI service using the Azure OpenAI client from the openai package.
 * Supports Azure-specific deployment model architecture where models are accessed
 * via deployment names rather than direct model identifiers.
 *
 * @example
 * ```typescript
 * // With explicit endpoint, API key, and API version
 * const azureService = new AzureOpenAIService({
 *   provider: 'azure-openai',
 *   model: 'gpt-4-deployment',
 *   fastestModel: 'gpt-35-turbo-deployment',
 *   endpoint: 'https://my-resource.openai.azure.com',
 *   apiKey: 'my-api-key',
 *   apiVersion: '2024-12-01-preview', // Optional, defaults to DEFAULT_AZURE_OPENAI_API_VERSION
 * });
 *
 * // Or using environment variables
 * const azureService = new AzureOpenAIService({
 *   provider: 'azure-openai',
 *   model: 'gpt-4-deployment',
 *   fastestModel: 'gpt-35-turbo-deployment',
 * });
 *
 * const result = await azureService.executePrompt('Hello world');
 * ```
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

  /**
   * Check if the Azure OpenAI service is properly configured and ready to use
   */
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

  /**
   * Initialize the Azure OpenAI client with API key and endpoint from configuration.
   * Prioritizes config values over environment variables.
   */
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
   * Get a list of available model deployments from Azure OpenAI.
   *
   * Note: Azure OpenAI uses deployment names (not model IDs) for executing prompts.
   * Listing deployments requires the Azure Management API with subscription ID and
   * resource group information, which is not available through the data plane API.
   *
   * Users must obtain deployment names from the Azure Portal:
   * Azure Portal > Azure OpenAI Resource > Model deployments
   *
   * @throws Error - This method is not implemented for Azure OpenAI provider
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
