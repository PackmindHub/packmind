import { PackmindLogger } from '@packmind/logger';
import {
  AbstractAIDelayedJob,
  IQueue,
  QueueListeners,
  WorkerListeners,
} from '@packmind/node-utils';
import { Job } from 'bullmq';
import {
  GenerateStandardEmbeddingInput,
  GenerateStandardEmbeddingOutput,
} from '../../domain/jobs/GenerateStandardEmbedding';
import { EmbeddingOrchestrationService } from '../services/EmbeddingOrchestrationService';

const logOrigin = 'GenerateStandardEmbeddingDelayedJob';

export class GenerateStandardEmbeddingDelayedJob extends AbstractAIDelayedJob<
  GenerateStandardEmbeddingInput,
  GenerateStandardEmbeddingOutput
> {
  readonly origin = logOrigin;

  constructor(
    queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<
      IQueue<GenerateStandardEmbeddingInput, GenerateStandardEmbeddingOutput>
    >,
    private readonly embeddingOrchestrationService: EmbeddingOrchestrationService,
    logger: PackmindLogger = new PackmindLogger(logOrigin),
  ) {
    super(queueFactory, logger);
  }

  async onFail(jobId: string): Promise<void> {
    this.logger.error(`[${this.origin}] Job ${jobId} failed after all retries`);
  }

  async runJob(
    jobId: string,
    input: GenerateStandardEmbeddingInput,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _controller: AbortController,
  ): Promise<GenerateStandardEmbeddingOutput> {
    this.logger.info(
      `[${this.origin}] Processing job ${jobId} for standard version ${input.versionId}`,
    );

    try {
      await this.embeddingOrchestrationService.generateAndSaveStandardEmbedding(
        input.versionId,
      );

      this.logger.info(`[${this.origin}] Job ${jobId} completed successfully`, {
        versionId: input.versionId,
      });

      return { versionId: input.versionId };
    } catch (error) {
      this.logger.error(`[${this.origin}] Job ${jobId} failed`, {
        versionId: input.versionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  getJobName(input: GenerateStandardEmbeddingInput): string {
    return `generate-standard-embedding-${input.versionId}-${Date.now()}`;
  }

  jobStartedInfo(input: GenerateStandardEmbeddingInput): string {
    return `versionId: ${input.versionId}`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<
      GenerateStandardEmbeddingInput,
      GenerateStandardEmbeddingOutput
    >
  > {
    return {
      completed: async (
        job: Job<
          GenerateStandardEmbeddingInput,
          GenerateStandardEmbeddingOutput,
          string
        >,
        result: GenerateStandardEmbeddingOutput,
      ) => {
        this.logger.info(`[${this.origin}] Job ${job.id} completed`, {
          versionId: result.versionId,
        });
      },
      failed: async (job, error) => {
        this.logger.error(`[${this.origin}] Job ${job?.id} failed`, {
          versionId: job?.data?.versionId,
          error: error.message,
        });
      },
    };
  }
}
