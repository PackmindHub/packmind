/**
 * Configuration types for LLM service providers.
 * Uses discriminated union pattern for type-safe configuration.
 */

/**
 * Enum for LLM service providers.
 * Centralizes provider identifiers to avoid magic strings.
 */
export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
  OPENAI_COMPATIBLE = 'openai-compatible',
  AZURE_OPENAI = 'azure-openai',
}

/**
 * OpenAI service configuration.
 * API key is retrieved from environment variable OPENAI_API_KEY.
 * Endpoint is hardcoded to OpenAI's official API.
 */
export type OpenAIServiceConfig = {
  provider: LLMProvider.OPENAI;
  model?: string;
  fastestModel?: string;
};

/**
 * Anthropic service configuration.
 * API key is retrieved from environment variable ANTHROPIC_API_KEY.
 * Endpoint is hardcoded to Anthropic's official API.
 */
export type AnthropicServiceConfig = {
  provider: LLMProvider.ANTHROPIC;
  model?: string;
  fastestModel?: string;
};

/**
 * Gemini service configuration.
 * API key is retrieved from environment variable GEMINI_API_KEY.
 * Uses Google's Generative AI API.
 */
export type GeminiServiceConfig = {
  provider: LLMProvider.GEMINI;
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
 * Discriminated union of all supported LLM service configurations.
 * The 'provider' field is used as the discriminator for type safety.
 */
export type LLMServiceConfig =
  | OpenAIServiceConfig
  | AnthropicServiceConfig
  | GeminiServiceConfig
  | OpenAICompatibleServiceConfig
  | AzureOpenAIServiceConfig;
