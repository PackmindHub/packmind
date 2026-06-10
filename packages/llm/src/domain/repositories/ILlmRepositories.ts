import { IAIProviderRepository } from './IAIProviderRepository';

/**
 * ILlmRepositories - Repository aggregator interface for the LLM domain.
 *
 * Centralizes repository instantiation behind getter methods so the
 * application layer (adapter, use cases) depends only on this abstraction
 * rather than concrete infrastructure repositories.
 */
export interface ILlmRepositories {
  getAIProviderRepository(): IAIProviderRepository;
}
