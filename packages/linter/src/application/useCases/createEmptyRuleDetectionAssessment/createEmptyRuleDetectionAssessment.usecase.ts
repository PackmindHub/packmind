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
 * Use case for creating an empty RuleDetectionAssessment with NOT_STARTED status.
 * Used during bulk imports where assessment should be created but not triggered.
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
    this.logger.info('Creating empty rule detection assessment', {
      ruleId: command.ruleId,
      language: command.language,
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

      // Create new assessment entity with NOT_STARTED status
      const assessmentId = createRuleDetectionAssessmentId(uuidv4());
      const assessment: CreateEmptyRuleDetectionAssessmentResponse = {
        id: assessmentId,
        ruleId: command.ruleId,
        language: command.language,
        detectionMode: DetectionModeEnum.SINGLE_AST,
        status: RuleDetectionAssessmentStatus.NOT_STARTED,
        details: '',
        clarificationQuestion: null,
        clarificationAnswers: null,
      };

      await this.linterRepositories
        .getRuleDetectionAssessmentRepository()
        .add(assessment);

      this.logger.info('Empty assessment created with NOT_STARTED status', {
        assessmentId: assessment.id,
        ruleId: command.ruleId,
        language: command.language,
      });

      return assessment;
    } catch (error) {
      this.logger.error('Failed to create empty rule detection assessment', {
        ruleId: command.ruleId,
        language: command.language,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
