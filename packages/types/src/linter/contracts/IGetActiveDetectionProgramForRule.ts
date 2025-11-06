import { IUseCase, PackmindCommand } from '../../UseCase';
import { RuleId } from '../../standards';
import { DetectionProgram } from '../DetectionProgram';

export type GetActiveDetectionProgramForRuleCommand = PackmindCommand & {
  standardSlug: string;
  ruleId: RuleId;
  language?: string;
};

export type GetActiveDetectionProgramForRuleResponse = {
  programs: DetectionProgram[];
  ruleContent: string;
  scope: string | null;
};

export type IGetActiveDetectionProgramForRule = IUseCase<
  GetActiveDetectionProgramForRuleCommand,
  GetActiveDetectionProgramForRuleResponse
>;
