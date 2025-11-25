import { Configuration } from '@packmind/node-utils';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  AIPromptOptions,
  AIPromptResult,
  AIService,
  LLMProvider,
  PromptConversation,
} from '@packmind/types';
import { PackmindServiceConfig } from '../../types/LLMServiceConfig';
import { OpenAIService } from './OpenAIService';
import { AnthropicService } from './AnthropicService';
import { GeminiService } from './GeminiService';

const origin = 'PackmindService';

/**
 * PackmindService is the default LLM provider for the Packmind SaaS platform.
 * It acts as a configurable proxy that delegates to a concrete provider based on
 * the PACKMIND_DEFAULT_PROVIDER environment variable.
 *
 * This design allows Packmind to switch the underlying LLM provider (OpenAI, Anthropic, etc.)
 * without code changes, simply by updating the environment variable.
 *
 * If PACKMIND_DEFAULT_PROVIDER is not set or contains an invalid value,
 * it defaults to OpenAI.
 */
export class PackmindService implements AIService {
  private underlyingService: AIService | null = null;
  private initialized = false;

  constructor(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    config: PackmindServiceConfig = { provider: LLMProvider.PACKMIND },
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    // Config parameter is for consistency with other services
    // but PackmindService doesn't use it directly
  }

  /**
   * Initialize the underlying provider based on PACKMIND_DEFAULT_PROVIDER env variable.
   * This is called lazily on first use to avoid initialization issues.
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const providerName = await this.getConfiguredProvider();
      this.logger.info('Initializing PackmindService with provider', {
        provider: providerName,
      });

      this.underlyingService = await this.createUnderlyingService(providerName);
      this.initialized = true;

      this.logger.info('PackmindService initialized successfully', {
        provider: providerName,
      });
    } catch (error) {
      this.logger.error('Failed to initialize PackmindService', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get the configured provider from environment variable.
   * Validates the value and defaults to OpenAI if not set or invalid.
   */
  private async getConfiguredProvider(): Promise<LLMProvider> {
    try {
      const providerValue = await Configuration.getConfig(
        'PACKMIND_DEFAULT_PROVIDER',
      );

      if (!providerValue) {
        this.logger.info(
          'PACKMIND_DEFAULT_PROVIDER not set, defaulting to OpenAI',
        );
        return LLMProvider.OPENAI;
      }

      // Validate that the provider value matches one of the enum values
      const validProviders = Object.values(LLMProvider);
      if (validProviders.includes(providerValue as LLMProvider)) {
        // Don't allow PACKMIND as the underlying provider (would cause infinite loop)
        if (providerValue === LLMProvider.PACKMIND) {
          this.logger.warn(
            'PACKMIND_DEFAULT_PROVIDER cannot be "packmind", defaulting to OpenAI',
          );
          return LLMProvider.OPENAI;
        }
        return providerValue as LLMProvider;
      }

      this.logger.warn(
        'Invalid PACKMIND_DEFAULT_PROVIDER value, defaulting to OpenAI',
        {
          providedValue: providerValue,
          validValues: validProviders.join(', '),
        },
      );
      return LLMProvider.OPENAI;
    } catch (error) {
      this.logger.warn(
        'Error reading PACKMIND_DEFAULT_PROVIDER, defaulting to OpenAI',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return LLMProvider.OPENAI;
    }
  }

  /**
   * Create the underlying service instance based on the provider.
   * Only supports OpenAI, Anthropic, and Gemini as underlying providers.
   * Retrieves the appropriate API key from configuration.
   */
  private async createUnderlyingService(
    provider: LLMProvider,
  ): Promise<AIService> {
    switch (provider) {
      case LLMProvider.OPENAI: {
        const apiKey = await Configuration.getConfig('OPENAI_API_KEY');
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY not found in configuration');
        }
        return new OpenAIService({ provider: LLMProvider.OPENAI, apiKey });
      }
      case LLMProvider.ANTHROPIC: {
        const apiKey = await Configuration.getConfig('ANTHROPIC_API_KEY');
        if (!apiKey) {
          throw new Error('ANTHROPIC_API_KEY not found in configuration');
        }
        return new AnthropicService({
          provider: LLMProvider.ANTHROPIC,
          apiKey,
        });
      }
      case LLMProvider.GEMINI: {
        const apiKey = await Configuration.getConfig('GEMINI_API_KEY');
        if (!apiKey) {
          throw new Error('GEMINI_API_KEY not found in configuration');
        }
        return new GeminiService({ provider: LLMProvider.GEMINI, apiKey });
      }
      case LLMProvider.PACKMIND:
        throw new Error('Cannot use PACKMIND as underlying provider');
      default:
        this.logger.error(
          `${provider} provider is not supported for PACKMIND_DEFAULT_PROVIDER`,
        );
        throw new Error(
          `${provider} provider is not supported for PACKMIND_DEFAULT_PROVIDER. Only openai, anthropic, and gemini are supported.`,
        );
    }
  }

  /**
   * Check if the underlying service is properly configured and ready to use.
   */
  async isConfigured(): Promise<boolean> {
    try {
      await this.initialize();
      if (!this.underlyingService) {
        return false;
      }
      return await this.underlyingService.isConfigured();
    } catch (error) {
      this.logger.warn('PackmindService configuration check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Execute a prompt using the underlying provider.
   */
  async executePrompt<T = string>(
    prompt: string,
    options?: AIPromptOptions,
  ): Promise<AIPromptResult<T>> {
    this.logger.info('Executing prompt via PackmindService', {
      promptLength: prompt.length,
    });

    try {
      await this.initialize();

      if (!this.underlyingService) {
        return {
          success: false,
          data: null,
          error: 'PackmindService not properly initialized',
          attempts: 1,
          model: 'unknown',
        };
      }

      return await this.underlyingService.executePrompt<T>(prompt, options);
    } catch (error) {
      return {
        success: false,
        data: null,
        error:
          error instanceof Error
            ? error.message
            : 'PackmindService initialization failed',
        attempts: 1,
        model: 'unknown',
      };
    }
  }

  /**
   * Execute a prompt with conversation history using the underlying provider.
   */
  async executePromptWithHistory<T = string>(
    conversationHistory: PromptConversation[],
    options?: AIPromptOptions,
  ): Promise<AIPromptResult<T>> {
    this.logger.info('Executing prompt with history via PackmindService', {
      conversationLength: conversationHistory.length,
    });

    try {
      await this.initialize();

      if (!this.underlyingService) {
        return {
          success: false,
          data: null,
          error: 'PackmindService not properly initialized',
          attempts: 1,
          model: 'unknown',
        };
      }

      return await this.underlyingService.executePromptWithHistory<T>(
        conversationHistory,
        options,
      );
    } catch (error) {
      return {
        success: false,
        data: null,
        error:
          error instanceof Error
            ? error.message
            : 'PackmindService initialization failed',
        attempts: 1,
        model: 'unknown',
      };
    }
  }

  /**
   * Get a list of available model IDs.
   * For PackmindService, returns empty array since models are managed internally.
   */
  async getModels(): Promise<string[]> {
    this.logger.info(
      'getModels called on PackmindService - returning empty array',
    );
    return [];
  }
}
