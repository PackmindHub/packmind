/**
 * Configuration types for LLM service providers.
 * Uses discriminated union pattern for type-safe configuration.
 */

import { LLMProvider } from '@packmind/types';

// Re-export LLMProvider for backward compatibility
export { LLMProvider } from '@packmind/types';

/**
 * OpenAI service configuration.
 * API key should be injected through the constructor.
 * Endpoint is hardcoded to OpenAI's official API.
 */
export type OpenAIServiceConfig = {
  provider: LLMProvider.OPENAI;
  apiKey: string;
  model?: string;
  fastestModel?: string;
};

/**
 * Anthropic service configuration.
 * API key should be injected through the constructor.
 * Endpoint is hardcoded to Anthropic's official API.
 */
export type AnthropicServiceConfig = {
  provider: LLMProvider.ANTHROPIC;
  apiKey: string;
  model?: string;
  fastestModel?: string;
};

/**
 * Gemini service configuration.
 * API key should be injected through the constructor.
 * Uses Google's Generative AI API.
 */
export type GeminiServiceConfig = {
  provider: LLMProvider.GEMINI;
  apiKey: string;
  model?: string;
  fastestModel?: string;
};

/**
 * OpenAI-compatible service configuration.
 * All fields are required including custom endpoint and API key.
 * Use this for providers like Google Gemini, Azure OpenAI, or local models.
 */
export type OpenAICompatibleServiceConfig = {
  provider: LLMProvider.OPENAI_COMPATIBLE;
  llmEndpoint: string;
  llmApiKey: string;
  model: string;
  fastestModel: string;
};

/**
 * Azure OpenAI service configuration.
 * Requires explicit deployment names for models.
 * API key and endpoint can be provided in config or retrieved from environment variables:
 * - AZURE_OPENAI_API_KEY (if apiKey not provided)
 * - AZURE_OPENAI_ENDPOINT (if endpoint not provided)
 */
export type AzureOpenAIServiceConfig = {
  provider: LLMProvider.AZURE_OPENAI;
  model: string;
  fastestModel: string;
  endpoint?: string;
  apiKey?: string;
  apiVersion?: string;
};

/**
 * Packmind service configuration.
 * This is the default provider for the SaaS platform.
 * Delegates to a concrete provider based on PACKMIND_DEFAULT_PROVIDER environment variable.
 * Defaults to OpenAI if not configured.
 */
export type PackmindServiceConfig = {
  provider: LLMProvider.PACKMIND;
};

/**
 * Discriminated union of all supported LLM service configurations.
 * The 'provider' field is used as the discriminator for type safety.
 */
export type LLMServiceConfig =
  | OpenAIServiceConfig
  | AnthropicServiceConfig
  | GeminiServiceConfig
  | OpenAICompatibleServiceConfig
  | AzureOpenAIServiceConfig
  | PackmindServiceConfig;
