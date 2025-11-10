import { PackmindLogger } from '@packmind/logger';
import { SSEEventPublisher } from '@packmind/node-utils';
import type { IStandardsPort, ILinterPort } from '@packmind/types';
import {
  AbstractAIDelayedJob,
  IQueue,
  QueueListeners,
  WorkerListeners,
} from '@packmind/jobs';
import {
  AssessRuleDetectionInput,
  AssessRuleDetectionOutput,
  AssessRuleDetectionJobCommand,
  RuleDetectionAssessmentStatus,
} from '@packmind/types';
import { Job } from 'bullmq';
import { AssessRuleDetectionUseCase } from './assessRuleDetection.usecase';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';

export class AssessRuleDetectionDelayedJob extends AbstractAIDelayedJob<
  AssessRuleDetectionInput,
  AssessRuleDetectionOutput
> {
  readonly origin = 'AssessRuleDetectionJob';

  constructor(
    queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<IQueue<AssessRuleDetectionInput, AssessRuleDetectionOutput>>,
    logger: PackmindLogger,
    private readonly linterRepositories: ILinterRepositories,
    private readonly getStandardsAdapter: () => IStandardsPort,
    private readonly getLinterAdapter: () => ILinterPort,
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
    input: AssessRuleDetectionInput,
    _controller: AbortController, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<AssessRuleDetectionOutput> {
    this.logger.info(
      `[${this.origin}] Processing job ${jobId} for rule: ${input.rule.content}`,
    );

    // Convert AssessRuleDetectionInput to AssessRuleDetectionJobCommand
    const command: AssessRuleDetectionJobCommand = {
      rule: input.rule,
      jobId,
      organizationId: input.organizationId,
      userId: input.userId,
      language: input.language,
      assessmentId: input.assessmentId,
    };

    const useCase = new AssessRuleDetectionUseCase(
      this.linterRepositories,
      this.getStandardsAdapter(),
      this.logger,
    );

    return await useCase.execute(command);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getJobName(_input: AssessRuleDetectionInput): string {
    return `assess-rule-detection-${Date.now()}`;
  }

  jobStartedInfo(input: AssessRuleDetectionInput): string {
    return `rule: ${input.rule.content}, language: ${input.language}`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<AssessRuleDetectionInput, AssessRuleDetectionOutput>
  > {
    return {
      completed: async (
        job: Job<AssessRuleDetectionInput, AssessRuleDetectionOutput, string>,
        result: AssessRuleDetectionOutput,
      ) => {
        this.logger.info(
          `[${this.origin}] Job ${job.id} completed successfully`,
        );

        try {
          // Get the input data from the job
          const input = job.data;

          // Fetch the assessment
          const assessment = await this.linterRepositories
            .getRuleDetectionAssessmentRepository()
            .findById(result.assessmentId);

          if (!assessment) {
            this.logger.error(
              `[${this.origin}] Assessment not found after job completion`,
              {
                assessmentId: result.assessmentId,
              },
            );
            return;
          }

          // Update status and details explicitly
          const updatedAssessment = {
            ...assessment,
            status: result.status,
            details: result.details,
          };

          await this.linterRepositories
            .getRuleDetectionAssessmentRepository()
            .update(updatedAssessment);

          this.logger.info(
            `[${this.origin}] Assessment updated for job ${job.id}`,
            {
              assessmentId: result.assessmentId,
              status: result.status,
            },
          );

          // Publish SSE event for assessment completion
          await SSEEventPublisher.publishAssessmentStatusEvent(
            updatedAssessment.ruleId,
            updatedAssessment.language,
            input.userId,
            input.organizationId,
          );

          this.logger.info(
            `[${this.origin}] SSE event published for assessment completion - job ${job.id}`,
            {
              assessmentId: result.assessmentId,
              status: result.status,
              userId: input.userId,
            },
          );

          // If assessment succeeded, automatically trigger program generation
          if (result.status === RuleDetectionAssessmentStatus.SUCCESS) {
            try {
              await this.getLinterAdapter().startGenerateProgram({
                organizationId: input.organizationId,
                userId: input.userId,
                ruleId: input.rule.id,
                language: input.language,
              });

              this.logger.info(
                `[${this.origin}] Program generation triggered after successful assessment`,
                {
                  ruleId: input.rule.id,
                  language: input.language,
                },
              );
            } catch (programGenerationError) {
              this.logger.error(
                `[${this.origin}] Failed to trigger program generation`,
                {
                  error:
                    programGenerationError instanceof Error
                      ? programGenerationError.message
                      : String(programGenerationError),
                },
              );
              // Don't throw - assessment was successful
            }
          }
        } catch (error) {
          this.logger.error(
            `[${this.origin}] Failed to handle completed job ${job.id}`,
            {
              error: error instanceof Error ? error.message : String(error),
            },
          );
          // Note: We don't throw here to avoid marking the job as failed
          // since the assessment itself was successful
        }
      },
      failed: async (job, error) => {
        this.logger.error(
          `[${this.origin}] Job ${job.id} failed with error: ${error.message}`,
        );

        try {
          const input = job.data;

          // Try to get assessment ID from job return value or input
          let assessmentId = input.assessmentId;
          if (job.returnvalue?.assessmentId) {
            assessmentId = job.returnvalue.assessmentId;
          }

          if (!assessmentId) {
            this.logger.warn(
              `[${this.origin}] No assessment ID available for failed job ${job.id} - will be retried later`,
            );
            return;
          }

          // Fetch existing assessment
          const existingAssessment = await this.linterRepositories
            .getRuleDetectionAssessmentRepository()
            .findById(assessmentId);

          if (!existingAssessment) {
            this.logger.warn(
              `[${this.origin}] Assessment not found for failed job ${job.id}`,
              {
                assessmentId,
              },
            );
            return;
          }

          // Update assessment status to FAILED
          const updatedAssessment = {
            ...existingAssessment,
            status: RuleDetectionAssessmentStatus.FAILED,
          };

          await this.linterRepositories
            .getRuleDetectionAssessmentRepository()
            .update(updatedAssessment);

          this.logger.info(
            `[${this.origin}] Assessment status updated to FAILED for failed job ${job.id}`,
            {
              assessmentId,
            },
          );

          // Publish SSE event for assessment failure
          await SSEEventPublisher.publishAssessmentStatusEvent(
            String(updatedAssessment.ruleId),
            String(updatedAssessment.language),
            input.userId,
            input.organizationId,
          );

          this.logger.info(
            `[${this.origin}] SSE event published for assessment failure - job ${job.id}`,
            {
              assessmentId,
              status: RuleDetectionAssessmentStatus.FAILED,
              userId: input.userId,
            },
          );
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
}
