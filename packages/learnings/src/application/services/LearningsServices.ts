import { PackmindLogger } from '@packmind/logger';
import { IRecipesPort, IStandardsPort } from '@packmind/types';
import { ILearningsRepositories } from '../../domain/repositories/ILearningsRepositories';
import { ITopicRepository } from '../../domain/repositories/ITopicRepository';
import { ITopicKnowledgePatchRepository } from '../../domain/repositories/ITopicKnowledgePatchRepository';
import { IRagLabConfigurationRepository } from '../../domain/repositories/IRagLabConfigurationRepository';
import { EmbeddingOrchestrationService } from './EmbeddingOrchestrationService';
import { KnowledgePatchService } from './KnowledgePatchService';
import { PatchApplicationService } from './PatchApplicationService';
import { TopicService } from './TopicService';

const origin = 'LearningsServices';

export class LearningsServices {
  private readonly topicService: TopicService;
  private readonly knowledgePatchService: KnowledgePatchService;
  private readonly topicRepository: ITopicRepository;
  private readonly topicKnowledgePatchRepository: ITopicKnowledgePatchRepository;
  private readonly ragLabConfigurationRepository: IRagLabConfigurationRepository;
  private patchApplicationService: PatchApplicationService | null = null;
  private embeddingOrchestrationService: EmbeddingOrchestrationService | null =
    null;

  constructor(
    learningsRepositories: ILearningsRepositories,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    logger.info('Initializing LearningsServices');

    this.topicRepository = learningsRepositories.getTopicRepository();

    this.topicService = new TopicService(this.topicRepository, logger);

    this.knowledgePatchService = new KnowledgePatchService(
      learningsRepositories.getKnowledgePatchRepository(),
      logger,
    );

    this.topicKnowledgePatchRepository =
      learningsRepositories.getTopicKnowledgePatchRepository();

    this.ragLabConfigurationRepository =
      learningsRepositories.getRagLabConfigurationRepository();

    logger.info('LearningsServices initialized successfully');
  }

  initializePatchApplicationService(
    standardsPort: IStandardsPort | null,
    recipesPort: IRecipesPort | null,
  ): void {
    this.patchApplicationService = new PatchApplicationService(
      standardsPort,
      recipesPort,
    );
  }

  initializeEmbeddingOrchestrationService(
    standardsPort: IStandardsPort,
    recipesPort: IRecipesPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ): void {
    this.embeddingOrchestrationService = new EmbeddingOrchestrationService(
      standardsPort,
      recipesPort,
      logger,
    );
  }

  getTopicService(): TopicService {
    return this.topicService;
  }

  getKnowledgePatchService(): KnowledgePatchService {
    return this.knowledgePatchService;
  }

  getTopicRepository(): ITopicRepository {
    return this.topicRepository;
  }

  getTopicKnowledgePatchRepository(): ITopicKnowledgePatchRepository {
    return this.topicKnowledgePatchRepository;
  }

  getPatchApplicationService(): PatchApplicationService | null {
    return this.patchApplicationService;
  }

  getEmbeddingOrchestrationService(): EmbeddingOrchestrationService {
    if (!this.embeddingOrchestrationService) {
      throw new Error(
        'EmbeddingOrchestrationService not initialized. Call initializeEmbeddingOrchestrationService() first.',
      );
    }
    return this.embeddingOrchestrationService;
  }

  getRagLabConfigurationRepository(): IRagLabConfigurationRepository {
    return this.ragLabConfigurationRepository;
  }
}
