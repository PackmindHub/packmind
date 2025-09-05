import { AIPromptResult, AIPromptOptions } from './types';

/**
 * Interface for AI service implementations.
 *
 * This interface defines the contract that any AI service provider
 * (OpenAI, Anthropic Claude, Google Gemini, etc.) must implement.
 * This abstraction allows the system to be extensible and provider-agnostic.
 */
export interface AIService {
  /**
   * Check if the AI service is properly configured and ready to use
   * @returns true if the service is configured and available, false otherwise
   */
  isConfigured(): Promise<boolean>;

  executePrompt<T = string>(
    prompt: string,
    options?: AIPromptOptions,
  ): Promise<AIPromptResult<T>>;
}
