import { PackmindLogger } from '@packmind/logger';
import {
  CreateEmptyRuleDetectionAssessmentCommand,
  CreateEmptyRuleDetectionAssessmentResponse,
  ICreateEmptyRuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
  createRuleDetectionAssessmentId,
  DetectionModeEnum,
} from '@packmind/types';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { v4 as uuidv4 } from 'uuid';

const origin = 'CreateEmptyRuleDetectionAssessmentUseCase';

/**
 * Use case for creating a RuleDetectionAssessment.
 * By default creates with NOT_STARTED status, but can be configured
 * to use SUCCESS status when importing ready-to-use detection programs.
 */
export class CreateEmptyRuleDetectionAssessmentUseCase
  implements ICreateEmptyRuleDetectionAssessment
{
  constructor(
    private readonly linterRepositories: ILinterRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: CreateEmptyRuleDetectionAssessmentCommand,
  ): Promise<CreateEmptyRuleDetectionAssessmentResponse> {
    const status = command.status ?? RuleDetectionAssessmentStatus.NOT_STARTED;
    const details = command.details ?? '';

    this.logger.info('Creating rule detection assessment', {
      ruleId: command.ruleId,
      language: command.language,
      status,
    });

    try {
      // Check if assessment already exists for this rule and language
      const existingAssessment = await this.linterRepositories
        .getRuleDetectionAssessmentRepository()
        .get(command.ruleId, command.language);

      if (existingAssessment) {
        this.logger.info(
          'Assessment already exists for rule and language, returning existing',
          {
            assessmentId: existingAssessment.id,
            ruleId: command.ruleId,
            language: command.language,
          },
        );
        return existingAssessment;
      }

      const assessmentId = createRuleDetectionAssessmentId(uuidv4());
      const assessment: CreateEmptyRuleDetectionAssessmentResponse = {
        id: assessmentId,
        ruleId: command.ruleId,
        language: command.language,
        detectionMode: DetectionModeEnum.SINGLE_AST,
        status,
        details,
        clarificationQuestion: null,
        clarificationAnswers: null,
      };

      await this.linterRepositories
        .getRuleDetectionAssessmentRepository()
        .add(assessment);

      this.logger.info('Assessment created', {
        assessmentId: assessment.id,
        ruleId: command.ruleId,
        language: command.language,
        status,
      });

      return assessment;
    } catch (error) {
      this.logger.error('Failed to create rule detection assessment', {
        ruleId: command.ruleId,
        language: command.language,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
