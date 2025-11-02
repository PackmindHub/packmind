import { IUseCase, PackmindCommand } from '../../UseCase';
import { ProgrammingLanguage } from '../../languages/Language';
import { RuleId } from '../../standards/Rule';
import { RuleDetectionAssessment } from '../RuleDetectionAssessment';

export type GetRuleDetectionAssessmentCommand = PackmindCommand & {
  ruleId: RuleId;
  language: ProgrammingLanguage;
};

export type GetRuleDetectionAssessmentResponse = {
  assessment: RuleDetectionAssessment | null;
};

export type IGetRuleDetectionAssessment = IUseCase<
  GetRuleDetectionAssessmentCommand,
  GetRuleDetectionAssessmentResponse
>;
