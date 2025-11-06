import { IUseCase, PackmindCommand } from '../../UseCase';
import { RuleId } from '../../standards';
import { DetectionProgram } from '../DetectionProgram';

export type GetDraftDetectionProgramForRuleCommand = PackmindCommand & {
  standardSlug: string;
  ruleId: RuleId;
  language?: string;
};

export type GetDraftDetectionProgramForRuleResponse = {
  programs: DetectionProgram[];
  ruleContent: string;
  scope: string | null;
};

export type IGetDraftDetectionProgramForRule = IUseCase<
  GetDraftDetectionProgramForRuleCommand,
  GetDraftDetectionProgramForRuleResponse
>;
