import { AIService, LLMProvider } from '@packmind/types';
import { LLMServiceConfig } from '../types/LLMServiceConfig';
import { OpenAIService } from '../infra/services/OpenAIService';
import { AnthropicService } from '../infra/services/AnthropicService';
import { GeminiService } from '../infra/services/GeminiService';
import { OpenAIAPICompatibleService } from '../infra/services/OpenAIAPICompatibleService';
import { AzureOpenAIService } from '../infra/services/AzureOpenAIService';
import { PackmindService } from '../infra/services/PackmindService';
import { UnknownLlmProviderError } from '../domain/errors';

/**
 * The single entry point for obtaining an `AIService`; consumers never
 * instantiate a provider service directly. Each service builds its own logger.
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
    case LLMProvider.PACKMIND:
      return new PackmindService(config);
    default: {
      // A missing case fails to compile here rather than at runtime.
      const _exhaustive: never = config;
      throw new UnknownLlmProviderError(
        (_exhaustive as LLMServiceConfig).provider,
      );
    }
  }
}
