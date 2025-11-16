import { PackmindLogger } from '@packmind/logger';
import {
  DistillAllPendingTopicsCommand,
  DistillAllPendingTopicsResponse,
  IDistillAllPendingTopicsUseCase,
} from '@packmind/types';
import { DistillAllPendingTopicsDelayedJob } from '../../jobs/DistillAllPendingTopicsDelayedJob';

const origin = 'DistillAllPendingTopicsUsecase';

export class DistillAllPendingTopicsUsecase
  implements IDistillAllPendingTopicsUseCase
{
  constructor(
    private readonly distillAllPendingTopicsDelayedJob: DistillAllPendingTopicsDelayedJob,
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
      // Queue the job for background processing
      const jobId = await this.distillAllPendingTopicsDelayedJob.addJob({
        spaceId: command.spaceId,
        organizationId: command.organizationId,
        userId: command.userId,
      });

      this.logger.info('Distill all pending topics job queued', {
        jobId,
        spaceId: command.spaceId,
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
