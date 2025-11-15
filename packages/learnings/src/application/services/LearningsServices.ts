import { PackmindLogger } from '@packmind/logger';
import { ILearningsRepositories } from '../../domain/repositories/ILearningsRepositories';
import { TopicService } from './TopicService';

const origin = 'LearningsServices';

export class LearningsServices {
  private readonly topicService: TopicService;

  constructor(
    learningsRepositories: ILearningsRepositories,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    logger.info('Initializing LearningsServices');

    this.topicService = new TopicService(
      learningsRepositories.getTopicRepository(),
      logger,
    );

    logger.info('LearningsServices initialized successfully');
  }

  getTopicService(): TopicService {
    return this.topicService;
  }
}
