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
  DistillAllPendingTopicsInput,
  DistillAllPendingTopicsOutput,
} from '../../domain/jobs/DistillAllPendingTopics';
import { TopicService } from '../services/TopicService';
import { DistillTopicUsecase } from '../useCases/distillTopic/distillTopic.usecase';

const logOrigin = 'DistillAllPendingTopicsDelayedJob';

export class DistillAllPendingTopicsDelayedJob extends AbstractAIDelayedJob<
  DistillAllPendingTopicsInput,
  DistillAllPendingTopicsOutput
> {
  readonly origin = logOrigin;

  constructor(
    queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<
      IQueue<DistillAllPendingTopicsInput, DistillAllPendingTopicsOutput>
    >,
    private readonly topicService: TopicService,
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
    input: DistillAllPendingTopicsInput,
    controller: AbortController,
  ): Promise<DistillAllPendingTopicsOutput> {
    this.logger.info(
      `[${this.origin}] Processing job ${jobId} for space: ${input.spaceId}`,
    );

    // Get all topics for the space
    const topics = await this.topicService.listTopicsBySpaceId(input.spaceId);

    this.logger.info(
      `[${this.origin}] Found ${topics.length} topics to process`,
    );

    let processedCount = 0;
    let failedCount = 0;

    // Process topics sequentially (no parallel execution)
    for (const topic of topics) {
      // Check if job was cancelled
      if (controller.signal.aborted) {
        this.logger.warn(
          `[${this.origin}] Job ${jobId} was cancelled, stopping processing`,
        );
        break;
      }

      try {
        this.logger.info(`[${this.origin}] Processing topic ${topic.id}`);

        await this.distillTopicUsecase.execute({
          topicId: topic.id,
          userId: input.userId,
          organizationId: input.organizationId,
        });

        processedCount++;
        this.logger.info(
          `[${this.origin}] Successfully processed topic ${topic.id}`,
        );
      } catch (error) {
        failedCount++;
        this.logger.error(
          `[${this.origin}] Failed to process topic ${topic.id}`,
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
      spaceId: input.spaceId,
      processedCount,
      failedCount,
    };
  }

  getJobName(input: DistillAllPendingTopicsInput): string {
    return `distill-all-pending-topics-${input.spaceId}-${Date.now()}`;
  }

  jobStartedInfo(input: DistillAllPendingTopicsInput): string {
    return `spaceId: ${input.spaceId}`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<DistillAllPendingTopicsInput, DistillAllPendingTopicsOutput>
  > {
    return {
      completed: async (
        job: Job<
          DistillAllPendingTopicsInput,
          DistillAllPendingTopicsOutput,
          string
        >,
        result: DistillAllPendingTopicsOutput,
      ) => {
        this.logger.info(
          `[${this.origin}] Job ${job.id} completed successfully`,
          {
            spaceId: result.spaceId,
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
