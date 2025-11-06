import { IUseCase, PackmindCommand } from '@packmind/types';
import { RuleId } from '../../standards/Rule';
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
