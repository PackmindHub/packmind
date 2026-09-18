import { LLMProvider } from './LLMProviderMetadata';

export { LLMProvider };

export type OpenAIServiceConfig = {
  provider: LLMProvider.OPENAI;
  apiKey: string;
  model?: string;
  fastestModel?: string;
};

export type AnthropicServiceConfig = {
  provider: LLMProvider.ANTHROPIC;
  apiKey: string;
  model?: string;
  fastestModel?: string;
};

export type GeminiServiceConfig = {
  provider: LLMProvider.GEMINI;
  apiKey: string;
  model?: string;
  fastestModel?: string;
};

/**
 * For local models (Ollama, LM Studio) and other OpenAI-compatible endpoints.
 * Gemini and Azure OpenAI have their own config types above.
 */
export type OpenAICompatibleServiceConfig = {
  provider: LLMProvider.OPENAI_COMPATIBLE;
  llmEndpoint: string;
  llmApiKey: string;
  model: string;
  fastestModel: string;
};

/**
 * `model` and `fastestModel` are Azure *deployment* names, not model names.
 * `apiKey` and `endpoint` are optional here because `AzureOpenAIService` falls
 * back to the `AZURE_OPENAI_API_KEY` / `AZURE_OPENAI_ENDPOINT` config values
 * when they are absent.
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
 * Carries no credentials: `PackmindService` resolves the concrete provider from
 * `PACKMIND_DEFAULT_PROVIDER`, falling back to OpenAI.
 */
export type PackmindServiceConfig = {
  provider: LLMProvider.PACKMIND;
};

export type LLMServiceConfig =
  | OpenAIServiceConfig
  | AnthropicServiceConfig
  | GeminiServiceConfig
  | OpenAICompatibleServiceConfig
  | AzureOpenAIServiceConfig
  | PackmindServiceConfig;
