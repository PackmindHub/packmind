import { IUseCase, PackmindCommand } from '../../UseCase';
import { RuleId } from '../../standards';
import { ProgrammingLanguage } from '../../languages';
import { RuleDetectionAssessment } from '../RuleDetectionAssessment';

export type CreateEmptyRuleDetectionAssessmentCommand = PackmindCommand & {
  ruleId: RuleId;
  language: ProgrammingLanguage;
};

export type CreateEmptyRuleDetectionAssessmentResponse =
  RuleDetectionAssessment;

export type ICreateEmptyRuleDetectionAssessment = IUseCase<
  CreateEmptyRuleDetectionAssessmentCommand,
  CreateEmptyRuleDetectionAssessmentResponse
>;
