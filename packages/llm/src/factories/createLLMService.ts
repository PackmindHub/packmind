import { AIService } from '@packmind/types';
import { LLMServiceConfig, LLMProvider } from '../types/LLMServiceConfig';
import { OpenAIService } from '../infra/services/OpenAIService';
import { AnthropicService } from '../infra/services/AnthropicService';
import { GeminiService } from '../infra/services/GeminiService';
import { OpenAIAPICompatibleService } from '../infra/services/OpenAIAPICompatibleService';
import { AzureOpenAIService } from '../infra/services/AzureOpenAIService';

/**
 * Factory function to create an LLM service based on configuration.
 * Uses discriminated union pattern for type-safe service instantiation.
 * Each service uses default logger unless overridden.
 *
 * @param config - LLM service configuration with provider discriminator
 * @param logger - Optional PackmindLogger instance. If not provided, each service creates its own default logger.
 * @returns Configured AIService instance
 *
 * @example
 * ```typescript
 * // Create OpenAI service with default logger
 * const openai = createLLMService({ provider: LLMProvider.OPENAI });
 *
 * // Create Anthropic service with custom models and custom logger
 * const anthropic = createLLMService({
 *   provider: LLMProvider.ANTHROPIC,
 *   model: 'claude-opus-4',
 *   fastestModel: 'claude-haiku-4',
 * }, customLogger);
 *
 * // Create OpenAI-compatible service (e.g., Gemini)
 * const gemini = createLLMService({
 *   provider: LLMProvider.OPENAI_COMPATIBLE,
 *   llmEndpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/',
 *   llmApiKey: process.env.GEMINI_API_KEY!,
 *   model: 'gemini-1.5-flash',
 *   fastestModel: 'gemini-1.5-flash-8b',
 * });
 * ```
 */
export function createLLMService(config: LLMServiceConfig): AIService {
  switch (config.provider) {
    case LLMProvider.OPENAI:
      return new OpenAIService(config);
    case LLMProvider.ANTHROPIC:
      return new AnthropicService(config);
    case LLMProvider.GEMINI:
      return new GeminiService(config);
    case LLMProvider.OPENAI_COMPATIBLE:
      return new OpenAIAPICompatibleService(config);
    case LLMProvider.AZURE_OPENAI:
      return new AzureOpenAIService(config);
    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = config;
      throw new Error(
        `Unknown provider: ${(_exhaustive as LLMServiceConfig).provider}`,
      );
    }
  }
}
