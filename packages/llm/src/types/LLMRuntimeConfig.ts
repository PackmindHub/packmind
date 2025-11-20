/**
 * Internal runtime configuration used by LLM services.
 * This represents the resolved configuration after applying defaults
 * and retrieving values from environment variables.
 */
export type LLMRuntimeConfig = {
  llmEndpoint: string;
  llmApiKey: string;
  model: string;
  fastestModel: string;
};
