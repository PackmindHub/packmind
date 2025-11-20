/**
 * Default model configurations for LLM service providers.
 * These are used as fallback values when models are not explicitly specified in config.
 */

/**
 * Default OpenAI models
 */
export const DEFAULT_OPENAI_MODELS = {
  model: 'gpt-5-mini',
  fastestModel: 'gpt-4.1-mini',
} as const;

/**
 * Default Anthropic models
 */
export const DEFAULT_ANTHROPIC_MODELS = {
  model: 'claude-sonnet-4-5-20250929',
  fastestModel: 'claude-haiku-4-5-20251001',
} as const;

/**
 * OpenAI official API endpoint
 */
export const OPENAI_ENDPOINT = 'https://api.openai.com/v1';

/**
 * Anthropic official API endpoint
 */
export const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com';

/**
 * Default Gemini models
 */
export const DEFAULT_GEMINI_MODELS = {
  model: 'gemini-3-pro-preview',
  fastestModel: 'gemini-2.5-flash',
} as const;

/**
 * Default Azure OpenAI API version
 */
export const DEFAULT_AZURE_OPENAI_API_VERSION = '2024-12-01-preview';
