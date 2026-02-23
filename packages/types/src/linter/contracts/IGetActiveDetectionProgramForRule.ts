import { IUseCase, PackmindCommand } from '../../UseCase';
import { RuleId } from '../../standards';
import { DetectionSeverity } from '../ActiveDetectionProgram';
import { DetectionProgram } from '../DetectionProgram';

export type GetActiveDetectionProgramForRuleCommand = PackmindCommand & {
  standardSlug: string;
  ruleId: RuleId;
  language?: string;
};

export type DetectionProgramWithSeverity = DetectionProgram & {
  severity?: DetectionSeverity;
};

export type GetActiveDetectionProgramForRuleResponse = {
  programs: DetectionProgramWithSeverity[];
  ruleContent: string;
  scope: string | null;
};

export type IGetActiveDetectionProgramForRule = IUseCase<
  GetActiveDetectionProgramForRuleCommand,
  GetActiveDetectionProgramForRuleResponse
>;
