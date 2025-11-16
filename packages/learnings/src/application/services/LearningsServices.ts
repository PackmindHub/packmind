import { PackmindLogger } from '@packmind/logger';
import { IRecipesPort, IStandardsPort } from '@packmind/types';
import { ILearningsRepositories } from '../../domain/repositories/ILearningsRepositories';
import { ITopicRepository } from '../../domain/repositories/ITopicRepository';
import { ITopicKnowledgePatchRepository } from '../../domain/repositories/ITopicKnowledgePatchRepository';
import { KnowledgePatchService } from './KnowledgePatchService';
import { PatchApplicationService } from './PatchApplicationService';
import { TopicService } from './TopicService';

const origin = 'LearningsServices';

export class LearningsServices {
  private readonly topicService: TopicService;
  private readonly knowledgePatchService: KnowledgePatchService;
  private readonly topicRepository: ITopicRepository;
  private readonly topicKnowledgePatchRepository: ITopicKnowledgePatchRepository;
  private patchApplicationService: PatchApplicationService | null = null;

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
}
