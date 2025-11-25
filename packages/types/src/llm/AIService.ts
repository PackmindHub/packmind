import {
  AIPromptResult,
  AIPromptOptions,
  PromptConversation,
} from './AIServiceTypes';

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

  /**
   * Execute a prompt with conversation history
   * @param prompt The user prompt to execute
   * @param conversationHistory Array of previous conversation messages
   * @param options Optional configuration for the prompt execution
   * @returns Promise resolving to the AI response result
   */
  executePromptWithHistory<T = string>(
    conversationHistory: PromptConversation[],
    options?: AIPromptOptions,
  ): Promise<AIPromptResult<T>>;

  /**
   * Get a list of available model IDs for this provider
   * @returns Promise resolving to an array of model ID strings
   */
  getModels(): Promise<string[]>;
}
