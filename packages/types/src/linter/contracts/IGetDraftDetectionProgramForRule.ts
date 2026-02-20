import { IUseCase, PackmindCommand } from '../../UseCase';
import { RuleId } from '../../standards';
import { DetectionProgramWithSeverity } from './IGetActiveDetectionProgramForRule';

export type GetDraftDetectionProgramForRuleCommand = PackmindCommand & {
  standardSlug: string;
  ruleId: RuleId;
  language?: string;
};

export type GetDraftDetectionProgramForRuleResponse = {
  programs: DetectionProgramWithSeverity[];
  ruleContent: string;
  scope: string | null;
};

export type IGetDraftDetectionProgramForRule = IUseCase<
  GetDraftDetectionProgramForRuleCommand,
  GetDraftDetectionProgramForRuleResponse
>;
