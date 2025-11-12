import { PackmindLogger } from '@packmind/logger';
import { SSEEventPublisher } from '@packmind/node-utils';
import { IStandardsPort } from '@packmind/types';
import {
  AssessRuleDetectionInput,
  RuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
  createRuleDetectionAssessmentId,
  DetectionModeEnum,
  IStartRuleDetectionAssessmentUseCase,
} from '@packmind/types';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { ILinterDelayedJobs } from '../../../domain/jobs/ILinterDelayedJobs';
import { v4 as uuidv4 } from 'uuid';

const origin = 'StartRuleDetectionAssessmentUseCase';

export class StartRuleDetectionAssessmentUseCase
  implements IStartRuleDetectionAssessmentUseCase
{
  constructor(
    private readonly linterRepositories: ILinterRepositories,
    private readonly linterDelayedJobs: ILinterDelayedJobs,
    private readonly standardsAdapter: IStandardsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    input: Omit<AssessRuleDetectionInput, 'assessmentId'>,
  ): Promise<RuleDetectionAssessment> {
    this.logger.info('Starting rule detection assessment', {
      ruleId: input.rule.id,
      language: input.language,
      userId: input.userId,
      organizationId: input.organizationId,
    });

    try {
      // Check if assessment already exists
      let assessment = await this.linterRepositories
        .getRuleDetectionAssessmentRepository()
        .get(input.rule.id, input.language);

      if (!assessment) {
        // Create new assessment entity with NOT_STARTED status
        const assessmentId = createRuleDetectionAssessmentId(uuidv4());
        assessment = {
          id: assessmentId,
          ruleId: input.rule.id,
          language: input.language,
          detectionMode: DetectionModeEnum.SINGLE_AST,
          status: RuleDetectionAssessmentStatus.NOT_STARTED,
          details: 'Assessment in progress...',
        };

        await this.linterRepositories
          .getRuleDetectionAssessmentRepository()
          .add(assessment);

        this.logger.info('New assessment created with NOT_STARTED status', {
          assessmentId: assessment.id,
        });
      } else {
        this.logger.info('Existing assessment found, reusing it', {
          assessmentId: assessment.id,
          currentStatus: assessment.status,
        });
      }

      // Enqueue job with assessment ID
      const jobInput: AssessRuleDetectionInput = {
        ...input,
        assessmentId: assessment.id,
      };

      const jobId =
        await this.linterDelayedJobs.assessRuleDetectionDelayedJob.addJob(
          jobInput,
        );

      this.logger.info('Assessment job enqueued', {
        assessmentId: assessment.id,
        jobId,
      });

      await SSEEventPublisher.publishAssessmentStatusEvent(
        assessment.ruleId,
        assessment.language,
        input.userId,
        input.organizationId,
      );

      this.logger.info('Assessment status change event published', {
        assessmentId: assessment.id,
        ruleId: assessment.ruleId,
        language: assessment.language,
        userId: input.userId,
        organizationId: input.organizationId,
      });

      return assessment;
    } catch (error) {
      this.logger.error('Failed to start rule detection assessment', {
        ruleId: input.rule.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
