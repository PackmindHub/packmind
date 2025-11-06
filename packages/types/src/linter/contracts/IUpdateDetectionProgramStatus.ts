import { IUseCase, PackmindCommand } from '../../UseCase';
import { ProgrammingLanguage } from '../../languages';
import { RuleId } from '../../standards';

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
