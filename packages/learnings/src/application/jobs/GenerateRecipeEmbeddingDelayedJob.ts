import { PackmindLogger } from '@packmind/logger';
import {
  AbstractAIDelayedJob,
  IQueue,
  QueueListeners,
  WorkerListeners,
} from '@packmind/node-utils';
import { Job } from 'bullmq';
import {
  GenerateRecipeEmbeddingInput,
  GenerateRecipeEmbeddingOutput,
} from '../../domain/jobs/GenerateRecipeEmbedding';
import { EmbeddingOrchestrationService } from '../services/EmbeddingOrchestrationService';

const logOrigin = 'GenerateRecipeEmbeddingDelayedJob';

export class GenerateRecipeEmbeddingDelayedJob extends AbstractAIDelayedJob<
  GenerateRecipeEmbeddingInput,
  GenerateRecipeEmbeddingOutput
> {
  readonly origin = logOrigin;

  constructor(
    queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<
      IQueue<GenerateRecipeEmbeddingInput, GenerateRecipeEmbeddingOutput>
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
    input: GenerateRecipeEmbeddingInput,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _controller: AbortController,
  ): Promise<GenerateRecipeEmbeddingOutput> {
    this.logger.info(
      `[${this.origin}] Processing job ${jobId} for recipe version ${input.versionId}`,
    );

    try {
      await this.embeddingOrchestrationService.generateAndSaveRecipeEmbedding(
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

  getJobName(input: GenerateRecipeEmbeddingInput): string {
    return `generate-recipe-embedding-${input.versionId}-${Date.now()}`;
  }

  jobStartedInfo(input: GenerateRecipeEmbeddingInput): string {
    return `versionId: ${input.versionId}`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<GenerateRecipeEmbeddingInput, GenerateRecipeEmbeddingOutput>
  > {
    return {
      completed: async (
        job: Job<
          GenerateRecipeEmbeddingInput,
          GenerateRecipeEmbeddingOutput,
          string
        >,
        result: GenerateRecipeEmbeddingOutput,
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
