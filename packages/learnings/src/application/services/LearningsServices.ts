import { PackmindLogger } from '@packmind/logger';
import { ILearningsRepositories } from '../../domain/repositories/ILearningsRepositories';
import { KnowledgePatchService } from './KnowledgePatchService';
import { TopicService } from './TopicService';

const origin = 'LearningsServices';

export class LearningsServices {
  private readonly topicService: TopicService;
  private readonly knowledgePatchService: KnowledgePatchService;

  constructor(
    learningsRepositories: ILearningsRepositories,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    logger.info('Initializing LearningsServices');

    this.topicService = new TopicService(
      learningsRepositories.getTopicRepository(),
      logger,
    );

    this.knowledgePatchService = new KnowledgePatchService(
      learningsRepositories.getKnowledgePatchRepository(),
      logger,
    );

    logger.info('LearningsServices initialized successfully');
  }

  getTopicService(): TopicService {
    return this.topicService;
  }

  getKnowledgePatchService(): KnowledgePatchService {
    return this.knowledgePatchService;
  }
}
