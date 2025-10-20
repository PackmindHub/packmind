import { getErrorMessage, PackmindLogger } from '@packmind/shared';
import {
  AbstractAIDelayedJob,
  IQueue,
  QueueListeners,
  WorkerListeners,
} from '@packmind/jobs';
import { Job } from 'bullmq';
import {
  GenerateStandardSummaryInput,
  GenerateStandardSummaryOutput,
} from '../../domain/jobs/GenerateStandardSummary';
import { StandardSummaryService } from '../services/StandardSummaryService';
import { UpdateStandardVersionSummaryUsecase } from '../useCases/updateStandardVersionSummary/updateStandardVersionSummary.usecase';

const logOrigin = 'GenerateStandardSummaryDelayedJob';

export class GenerateStandardSummaryDelayedJob extends AbstractAIDelayedJob<
  GenerateStandardSummaryInput,
  GenerateStandardSummaryOutput
> {
  readonly origin = logOrigin;

  constructor(
    queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<
      IQueue<GenerateStandardSummaryInput, GenerateStandardSummaryOutput>
    >,
    private readonly _updateStandardVersionSummaryUsecase: UpdateStandardVersionSummaryUsecase,
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
    input: GenerateStandardSummaryInput,
    _controller: AbortController, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<GenerateStandardSummaryOutput> {
    this.logger.info(
      `[${this.origin}] Processing job ${jobId} with input standard: ${input.standardVersion.standardId}`,
    );

    const summary = await new StandardSummaryService(
      this.logger,
    ).createStandardSummary(input.standardVersion, input.rules);
    return {
      organizationId: input.organizationId,
      userId: input.userId,
      standardVersion: input.standardVersion,
      summary,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getJobName(_input: GenerateStandardSummaryInput): string {
    return `generate-standard-summary-${Date.now()}`;
  }

  jobStartedInfo(input: GenerateStandardSummaryInput): string {
    return `value: ${input.standardVersion.standardId}`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<GenerateStandardSummaryInput, GenerateStandardSummaryOutput>
  > {
    return {
      completed: async (
        job: Job<
          GenerateStandardSummaryInput,
          GenerateStandardSummaryOutput,
          string
        >,
        result: GenerateStandardSummaryOutput,
      ) => {
        this.logger.info(
          `[${this.origin}] Job ${job.id} completed successfully`,
        );

        try {
          if (!result.summary?.length) {
            this.logger.warn(
              `[${this.origin}] Job ${job.id} did not generate any summary, will not save it`,
            );
          }

          this.logger.info(
            `[${this.origin}] Job ${job.id} - Will update summary for standard ${result.standardVersion.standardId}`,
          );
          await this.updateSummaryForStandardVersionId(result);
        } catch (error) {
          this.logger.error(
            `[${this.origin}] Failed to update StandardSummary for job ${job.id}`,
            {
              error: getErrorMessage(error),
            },
          );
          // Note: We don't throw here to avoid marking the job as failed
          // since the program generation itself was successful
        }
      },
      failed: async (job, error) => {
        this.logger.error(
          `[${this.origin}] Job ${job.id} failed with error: ${error.message}`,
        );
      },
    };
  }

  private async updateSummaryForStandardVersionId(
    result: GenerateStandardSummaryOutput,
  ) {
    await this._updateStandardVersionSummaryUsecase.execute({
      organizationId: result.organizationId,
      standardVersionId: result.standardVersion.id,
      summary: result.summary,
      userId: result.userId,
    });
  }
}
