import { PackmindLogger } from '@packmind/logger';
import {
  DistillAllPendingTopicsCommand,
  DistillAllPendingTopicsResponse,
  IDistillAllPendingTopicsUseCase,
} from '@packmind/types';
import { DistillTopicsDelayedJob } from '../../jobs/DistillTopicsDelayedJob';
import { TopicService } from '../../services/TopicService';

const origin = 'DistillAllPendingTopicsUsecase';

export class DistillAllPendingTopicsUsecase
  implements IDistillAllPendingTopicsUseCase
{
  constructor(
    private readonly distillTopicsDelayedJob: DistillTopicsDelayedJob,
    private readonly topicService: TopicService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('DistillAllPendingTopicsUsecase initialized');
  }

  async execute(
    command: DistillAllPendingTopicsCommand,
  ): Promise<DistillAllPendingTopicsResponse> {
    this.logger.info('Executing distillAllPendingTopics use case', {
      spaceId: command.spaceId,
      userId: command.userId,
    });

    try {
      // Fetch all topics for the space
      const topics = await this.topicService.listTopicsBySpaceId(
        command.spaceId,
      );

      this.logger.info('Found topics to distill', {
        count: topics.length,
        spaceId: command.spaceId,
      });

      if (topics.length === 0) {
        this.logger.info('No topics to distill', {
          spaceId: command.spaceId,
        });
        return {
          jobId: 'no-topics',
        };
      }

      // Queue the job for background processing with all topic IDs
      const topicIds = topics.map((topic) => topic.id);
      const jobId = await this.distillTopicsDelayedJob.addJob({
        topicIds,
        organizationId: command.organizationId,
        userId: command.userId,
      });

      this.logger.info('Distill all pending topics job queued', {
        jobId,
        spaceId: command.spaceId,
        topicCount: topicIds.length,
      });

      return {
        jobId,
      };
    } catch (error) {
      this.logger.error('Failed to queue distillAllPendingTopics job', {
        spaceId: command.spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
