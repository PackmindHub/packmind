import {
  AIPromptResult,
  AIPromptOptions,
  PromptConversation,
} from './AIServiceTypes';

export interface AIService {
  isConfigured(): Promise<boolean>;

  executePrompt<T = string>(
    prompt: string,
    options?: AIPromptOptions,
  ): Promise<AIPromptResult<T>>;

  executePromptWithHistory<T = string>(
    conversationHistory: PromptConversation[],
    options?: AIPromptOptions,
  ): Promise<AIPromptResult<T>>;

  getModels(): Promise<string[]>;
}
