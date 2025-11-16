import { PackmindLogger } from '@packmind/logger';
import {
  GetTopicsStatsCommand,
  GetTopicsStatsResponse,
  IGetTopicsStatsUseCase,
  TopicStatus,
} from '@packmind/types';
import { TopicService } from '../../services/TopicService';
import { KnowledgePatchService } from '../../services/KnowledgePatchService';

const origin = 'GetTopicsStatsUsecase';

export class GetTopicsStatsUsecase implements IGetTopicsStatsUseCase {
  constructor(
    private readonly topicService: TopicService,
    private readonly knowledgePatchService: KnowledgePatchService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('GetTopicsStatsUsecase initialized');
  }

  async execute(
    command: GetTopicsStatsCommand,
  ): Promise<GetTopicsStatsResponse> {
    this.logger.info('Executing getTopicsStats use case', {
      spaceId: command.spaceId,
    });

    try {
      // Get all topics for the space
      const topics = await this.topicService.listTopicsBySpaceId(
        command.spaceId,
      );

      // Count pending topics (topics with status PENDING)
      const pendingTopics = topics.filter(
        (topic) => topic.status === TopicStatus.PENDING,
      ).length;

      this.logger.info('Topics stats calculated', {
        spaceId: command.spaceId,
        totalTopics: topics.length,
        pendingTopics,
      });

      return {
        totalTopics: topics.length,
        pendingTopics,
      };
    } catch (error) {
      this.logger.error('Failed to execute getTopicsStats use case', {
        spaceId: command.spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
