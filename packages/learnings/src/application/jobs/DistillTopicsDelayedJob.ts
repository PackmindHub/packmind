import { PackmindLogger } from '@packmind/logger';
import { getErrorMessage } from '@packmind/node-utils';
import {
  AbstractAIDelayedJob,
  IQueue,
  QueueListeners,
  WorkerListeners,
} from '@packmind/node-utils';
import { Job } from 'bullmq';
import {
  DistillTopicsInput,
  DistillTopicsOutput,
} from '../../domain/jobs/DistillTopics';
import { DistillTopicUsecase } from '../useCases/distillTopic/distillTopic.usecase';

const logOrigin = 'DistillTopicsDelayedJob';

export class DistillTopicsDelayedJob extends AbstractAIDelayedJob<
  DistillTopicsInput,
  DistillTopicsOutput
> {
  readonly origin = logOrigin;

  constructor(
    queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<IQueue<DistillTopicsInput, DistillTopicsOutput>>,
    private readonly distillTopicUsecase: DistillTopicUsecase,
    logger: PackmindLogger = new PackmindLogger(logOrigin),
  ) {
    super(queueFactory, logger);
  }

  async onFail(jobId: string): Promise<void> {
    this.logger.error(
      `[${this.origin}] Job ${jobId} failed - status will be updated in failed listener`,
    );
  }

  async runJob(
    jobId: string,
    input: DistillTopicsInput,
    controller: AbortController,
  ): Promise<DistillTopicsOutput> {
    this.logger.info(
      `[${this.origin}] Processing job ${jobId} for ${input.topicIds.length} topics`,
    );

    let processedCount = 0;
    let failedCount = 0;

    // Process topics sequentially (no parallel execution)
    for (const topicId of input.topicIds) {
      // Check if job was cancelled
      if (controller.signal.aborted) {
        this.logger.warn(
          `[${this.origin}] Job ${jobId} was cancelled, stopping processing`,
        );
        break;
      }

      try {
        this.logger.info(`[${this.origin}] Processing topic ${topicId}`);

        await this.distillTopicUsecase.execute({
          topicId,
          userId: input.userId,
          organizationId: input.organizationId,
        });

        processedCount++;
        this.logger.info(
          `[${this.origin}] Successfully processed topic ${topicId}`,
        );
      } catch (error) {
        failedCount++;
        this.logger.error(
          `[${this.origin}] Failed to process topic ${topicId}`,
          {
            error: getErrorMessage(error),
          },
        );
        // Continue processing other topics even if one fails
      }
    }

    this.logger.info(
      `[${this.origin}] Job ${jobId} completed - Processed: ${processedCount}, Failed: ${failedCount}`,
    );

    return {
      topicIds: input.topicIds,
      processedCount,
      failedCount,
    };
  }

  getJobName(input: DistillTopicsInput): string {
    return `distill-topics-${input.topicIds.join('-')}-${Date.now()}`;
  }

  jobStartedInfo(input: DistillTopicsInput): string {
    return `topicIds: ${input.topicIds.join(', ')} (${input.topicIds.length} topics)`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<DistillTopicsInput, DistillTopicsOutput>
  > {
    return {
      completed: async (
        job: Job<DistillTopicsInput, DistillTopicsOutput, string>,
        result: DistillTopicsOutput,
      ) => {
        this.logger.info(
          `[${this.origin}] Job ${job.id} completed successfully`,
          {
            topicCount: result.topicIds.length,
            processedCount: result.processedCount,
            failedCount: result.failedCount,
          },
        );
      },
      failed: async (job, error) => {
        this.logger.error(
          `[${this.origin}] Job ${job?.id} failed with error: ${error.message}`,
        );
      },
    };
  }
}
