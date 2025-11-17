import { PackmindLogger } from '@packmind/logger';
import {
  DistillTopicCommand,
  DistillTopicResponse,
  IDistillTopicUseCase,
} from '@packmind/types';
import { DistillTopicsDelayedJob } from '../../jobs/DistillTopicsDelayedJob';

const origin = 'QueueDistillTopicsUsecase';

export class QueueDistillTopicsUsecase implements IDistillTopicUseCase {
  constructor(
    private readonly distillTopicsDelayedJob: DistillTopicsDelayedJob,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('QueueDistillTopicsUsecase initialized');
  }

  async execute(command: DistillTopicCommand): Promise<DistillTopicResponse> {
    this.logger.info('Executing queueDistillTopics use case', {
      topicId: command.topicId,
      userId: command.userId,
    });

    try {
      // Queue the job for background processing with a single topic
      const jobId = await this.distillTopicsDelayedJob.addJob({
        topicIds: [command.topicId],
        organizationId: command.organizationId,
        userId: command.userId,
      });

      this.logger.info('Distill topic job queued', {
        jobId,
        topicId: command.topicId,
      });

      return {
        jobId,
        topicId: command.topicId,
        patchIds: [], // Patches will be created by the job
      };
    } catch (error) {
      this.logger.error('Failed to queue distillTopic job', {
        topicId: command.topicId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
