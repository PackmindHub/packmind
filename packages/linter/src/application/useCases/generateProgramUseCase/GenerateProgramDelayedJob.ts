import { PackmindLogger } from '@packmind/logger';
import { SSEEventPublisher } from '@packmind/node-utils';
import { IStandardsPort, ILinterAstPort } from '@packmind/types';
import { DetectionStatus } from '@packmind/types';
import {
  AbstractAIDelayedJob,
  IQueue,
  QueueListeners,
  WorkerListeners,
} from '@packmind/jobs';
import { GenerateProgramInput } from '@packmind/types';
import { GenerateProgramOutput } from '@packmind/types';
import { Job } from 'bullmq';
import { DetectionProgram } from '@packmind/types';
import { UpdateDetectionProgramCommand } from '@packmind/types';
import { GenerateProgramUseCase } from './generateProgram.usecase';
import { GenerateProgramJobCommand } from '@packmind/types';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { UpdateDetectionProgramUseCase } from '../updateDetectionProgram/updateDetectionProgram.usecase';

export class GenerateProgramDelayedJob extends AbstractAIDelayedJob<
  GenerateProgramInput,
  GenerateProgramOutput
> {
  readonly origin = 'GenerateProgramJob';

  constructor(
    queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<IQueue<GenerateProgramInput, GenerateProgramOutput>>,
    logger: PackmindLogger,
    private readonly linterRepositories: ILinterRepositories,
    private readonly getStandardsAdapter: () => IStandardsPort,
    private readonly getLinterAstAdapter: () => ILinterAstPort | null,
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
    input: GenerateProgramInput,
    _controller: AbortController, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<GenerateProgramOutput> {
    this.logger.info(
      `[${this.origin}] Processing job ${jobId} with input: ${input.value}`,
    );

    // Convert GenerateProgramInput to GenerateProgramJobCommand
    const command: GenerateProgramJobCommand = {
      value: input.value,
      rule: input.rule,
      ruleId: input.rule.id,
      jobId,
      organizationId: input.organizationId,
      userId: input.userId,
      language: input.language,
      detectionProgramId: input.detectionProgramId,
      activeDetectionProgramId: input.activeDetectionProgramId,
    };

    const linterAstAdapter = this.getLinterAstAdapter();

    const useCase = new GenerateProgramUseCase(
      this.linterRepositories,
      this.getStandardsAdapter(),
      linterAstAdapter,
      this.logger,
    );

    return await useCase.execute(command);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getJobName(_input: GenerateProgramInput): string {
    return `generate-program-${Date.now()}`;
  }

  jobStartedInfo(input: GenerateProgramInput): string {
    return `value: ${input.value} - detectionProgramId: ${input.detectionProgramId}`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<GenerateProgramInput, GenerateProgramOutput>
  > {
    return {
      completed: async (
        job: Job<GenerateProgramInput, GenerateProgramOutput, string>,
        result: GenerateProgramOutput,
      ) => {
        this.logger.info(
          `[${this.origin}] Job ${job.id} completed successfully`,
        );

        try {
          // Get the input data from the job
          const input = job.data;

          const updatedDetectionProgram = await this.updateDetectionProgram(
            result,
            input,
          );
          this.logger.info(
            `[${this.origin}] DetectionProgram updated with final code and ${result.status} status for job ${job.id}`,
            {
              detectionProgramId: result.detectionProgramId,
              status: result.status,
            },
          );

          // Publish SSE event for program completion
          await SSEEventPublisher.publishProgramStatusEvent(
            result.detectionProgramId,
            updatedDetectionProgram.ruleId,
            updatedDetectionProgram.language,
            input.userId,
            input.organizationId,
          );
          this.logger.info(
            `[${this.origin}] SSE event published for program completion - job ${job.id}`,
            {
              detectionProgramId: result.detectionProgramId,
              status: result.status,
              userId: input.userId,
            },
          );
        } catch (error) {
          this.logger.error(
            `[${this.origin}] Failed to update DetectionProgram for job ${job.id}`,
            {
              error: error instanceof Error ? error.message : String(error),
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

        try {
          const input = job.data;

          // Try to get program ID from job return value if it exists
          let detectionProgramId: string | undefined;
          if (job.returnvalue?.detectionProgramId) {
            detectionProgramId = job.returnvalue.detectionProgramId;
          }
          if (!detectionProgramId && job.data?.detectionProgramId) {
            detectionProgramId = job.data
              .detectionProgramId as unknown as string;
          }

          // Update detection program status to ERROR if it was created
          if (detectionProgramId) {
            let programForEvent: DetectionProgram | null = null;
            try {
              // Fetch existing program to preserve current code when updating status
              const existingProgram = await this.linterRepositories
                .getDetectionProgramRepository()
                .findById(
                  detectionProgramId as unknown as DetectionProgram['id'],
                );

              if (!existingProgram) {
                throw new Error('Detection program not found for failed job');
              }

              programForEvent = existingProgram;

              const updateDetectionProgramCommand: UpdateDetectionProgramCommand =
                {
                  detectionProgramId:
                    detectionProgramId as unknown as DetectionProgram['id'],
                  code: existingProgram.code,
                  status: DetectionStatus.ERROR,
                  organizationId: input.organizationId,
                  userId: input.userId,
                };

              const updateDetectionProgramUseCase =
                new UpdateDetectionProgramUseCase(
                  this.linterRepositories.getDetectionProgramRepository(),
                );
              await updateDetectionProgramUseCase.execute(
                updateDetectionProgramCommand,
              );

              this.logger.info(
                `[${this.origin}] DetectionProgram status updated to ERROR for failed job ${job.id}`,
                {
                  detectionProgramId,
                },
              );
            } catch (updateError) {
              this.logger.error(
                `[${this.origin}] Failed to update DetectionProgram status to ERROR for job ${job.id}`,
                {
                  error:
                    updateError instanceof Error
                      ? updateError.message
                      : String(updateError),
                },
              );
            }
            if (programForEvent) {
              // Publish SSE event for program failure
              await SSEEventPublisher.publishProgramStatusEvent(
                String(detectionProgramId),
                String(programForEvent.ruleId),
                String(programForEvent.language),
                input.userId,
                input.organizationId,
              );
              this.logger.info(
                `[${this.origin}] SSE event published for program failure - job ${job.id}`,
                {
                  detectionProgramId,
                  status: DetectionStatus.ERROR,
                  userId: input.userId,
                },
              );
            } else {
              this.logger.warn(
                `[${this.origin}] Skipping SSE publish for program failure - missing program context`,
                {
                  detectionProgramId,
                },
              );
            }
          } else {
            this.logger.warn(
              `[${this.origin}] Could not update DetectionProgram or publish SSE event for failed job ${job.id} - no detection program ID available`,
            );
          }
        } catch (sseError) {
          this.logger.error(
            `[${this.origin}] Failed to handle failed job ${job.id}`,
            {
              error:
                sseError instanceof Error ? sseError.message : String(sseError),
            },
          );
        }
      },
    };
  }

  private async updateDetectionProgram(
    result: GenerateProgramOutput,
    input: GenerateProgramInput,
  ) {
    // First, update the DetectionProgram with final code and SUCCESS status
    const updateDetectionProgramCommand: UpdateDetectionProgramCommand = {
      detectionProgramId: result.detectionProgramId,
      code: result.code,
      status: result.status,
      organizationId: input.organizationId,
      userId: input.userId,
      sourceCodeState: result.sourceCodeState,
    };

    const updateDetectionProgramUseCase = new UpdateDetectionProgramUseCase(
      this.linterRepositories.getDetectionProgramRepository(),
    );
    const updatedDetectionProgram = await updateDetectionProgramUseCase.execute(
      updateDetectionProgramCommand,
    );

    return updatedDetectionProgram;
  }
}
