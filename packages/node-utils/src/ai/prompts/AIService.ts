import { AIPromptResult, AIPromptOptions, PromptConversation } from './types';

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
   * Generate embedding vector for a single text
   * @param text The text to generate embedding for
   * @param options Optional configuration for embedding generation (model, dimensions)
   * @returns Promise resolving to embedding vector (1536 dimensions for text-embedding-3-small by default)
   */
  generateEmbedding(
    text: string,
    options?: { model?: string; dimensions?: number },
  ): Promise<number[]>;

  /**
   * Generate embedding vectors for multiple texts in batch
   * @param texts Array of texts to generate embeddings for
   * @param options Optional configuration for embedding generation (model, dimensions)
   * @returns Promise resolving to array of embedding vectors
   */
  generateEmbeddings(
    texts: string[],
    options?: { model?: string; dimensions?: number },
  ): Promise<number[][]>;
}
