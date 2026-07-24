import { DataSource } from 'typeorm';
import { ILlmRepositories } from '../../domain/repositories/ILlmRepositories';
import { IAIProviderRepository } from '../../domain/repositories/IAIProviderRepository';
import { AIProviderRepository } from './AIProviderRepository';
import { AIProviderSchema } from '../schemas/AIProviderSchema';

/**
 * LlmRepositories - Repository aggregator for the LLM domain.
 *
 * Owns the wiring between the TypeORM DataSource and the concrete repository
 * implementations, exposing them through the ILlmRepositories interface so the
 * application layer never instantiates infrastructure repositories directly.
 */
export class LlmRepositories implements ILlmRepositories {
  private readonly aiProviderRepository: IAIProviderRepository;

  constructor(dataSource: DataSource) {
    this.aiProviderRepository = new AIProviderRepository(
      dataSource.getRepository(AIProviderSchema),
    );
  }

  getAIProviderRepository(): IAIProviderRepository {
    return this.aiProviderRepository;
  }
}
