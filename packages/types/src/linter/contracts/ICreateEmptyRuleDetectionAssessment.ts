import { IUseCase, PackmindCommand } from '../../UseCase';
import { RuleId } from '../../standards';
import { ProgrammingLanguage } from '../../languages';
import {
  RuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
} from '../RuleDetectionAssessment';

export type CreateEmptyRuleDetectionAssessmentCommand = PackmindCommand & {
  ruleId: RuleId;
  language: ProgrammingLanguage;
  /**
   * Optional status for the assessment. Defaults to NOT_STARTED.
   * Use SUCCESS when importing detection programs that are ready to use.
   */
  status?: RuleDetectionAssessmentStatus;
  /**
   * Optional details for the assessment.
   */
  details?: string;
};

export type CreateEmptyRuleDetectionAssessmentResponse =
  RuleDetectionAssessment;

export type ICreateEmptyRuleDetectionAssessment = IUseCase<
  CreateEmptyRuleDetectionAssessmentCommand,
  CreateEmptyRuleDetectionAssessmentResponse
>;
