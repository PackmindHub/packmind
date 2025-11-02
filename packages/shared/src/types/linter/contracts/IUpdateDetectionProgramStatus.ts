import { IUseCase, PackmindCommand } from '../../UseCase';
import { ProgrammingLanguage } from '../../languages/Language';
import { RuleId } from '../../standards/Rule';

export type UpdateDetectionProgramStatusCommand = PackmindCommand & {
  ruleId: RuleId;
  language: ProgrammingLanguage;
};

export interface UpdateRuleDetectionAssessmentAfterUpdateResponse {
  action: 'ASSESSMENT_STARTED' | 'STATUS_UPDATED' | 'NO_ACTION';
  message: string;
}

export type IUpdateDetectionProgramStatusUseCase = IUseCase<
  UpdateDetectionProgramStatusCommand,
  UpdateRuleDetectionAssessmentAfterUpdateResponse
>;
