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
import {
  PackmindProviderApiKeyMissingError,
  PackmindProviderUnsupportedError,
} from '../../domain/errors';

const origin = 'PackmindService';

/**
 * Carries no credentials of its own: every call is delegated to the concrete
 * provider named by `PACKMIND_DEFAULT_PROVIDER`, falling back to OpenAI when
 * that value is missing or unusable.
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
    // `config` is accepted only to match the other services' constructors.
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    const providerName = await this.getConfiguredProvider();
    this.logger.info('Initializing PackmindService with provider', {
      provider: providerName,
    });

    this.underlyingService = await this.createUnderlyingService(providerName);
    this.initialized = true;

    this.logger.info('PackmindService initialized successfully', {
      provider: providerName,
    });
  }

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

      const validProviders = Object.values(LLMProvider);
      if (validProviders.includes(providerValue as LLMProvider)) {
        // `createUnderlyingService` rejects PACKMIND, so self-delegation is
        // turned into the default here rather than a failed initialization.
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

  private async createUnderlyingService(
    provider: LLMProvider,
  ): Promise<AIService> {
    switch (provider) {
      case LLMProvider.OPENAI: {
        const apiKey = await Configuration.getConfig('OPENAI_API_KEY');
        if (!apiKey) {
          throw new PackmindProviderApiKeyMissingError(
            provider,
            'OPENAI_API_KEY',
          );
        }
        return new OpenAIService({ provider: LLMProvider.OPENAI, apiKey });
      }
      case LLMProvider.ANTHROPIC: {
        const apiKey = await Configuration.getConfig('ANTHROPIC_API_KEY');
        if (!apiKey) {
          throw new PackmindProviderApiKeyMissingError(
            provider,
            'ANTHROPIC_API_KEY',
          );
        }
        return new AnthropicService({
          provider: LLMProvider.ANTHROPIC,
          apiKey,
        });
      }
      case LLMProvider.GEMINI: {
        const apiKey = await Configuration.getConfig('GEMINI_API_KEY');
        if (!apiKey) {
          throw new PackmindProviderApiKeyMissingError(
            provider,
            'GEMINI_API_KEY',
          );
        }
        return new GeminiService({ provider: LLMProvider.GEMINI, apiKey });
      }
      case LLMProvider.PACKMIND:
        throw new PackmindProviderUnsupportedError(
          provider,
          'Cannot use PACKMIND as underlying provider',
        );
      default:
        throw new PackmindProviderUnsupportedError(
          provider,
          `${provider} provider is not supported for PACKMIND_DEFAULT_PROVIDER. Only openai, anthropic, and gemini are supported.`,
        );
    }
  }

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
   * Returns nothing to choose from: the provider and its models are fixed by
   * `PACKMIND_DEFAULT_PROVIDER`, not selectable per organization.
   */
  async getModels(): Promise<string[]> {
    this.logger.info(
      'getModels called on PackmindService - returning empty array',
    );
    return [];
  }
}
