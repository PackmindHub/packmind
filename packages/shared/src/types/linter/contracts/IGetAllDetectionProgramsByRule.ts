import { IUseCase, PackmindCommand } from '../../UseCase';
import { RuleId } from '../../standards/Rule';
import { DetectionProgram } from '../DetectionProgram';

export type GetAllDetectionProgramsByRuleCommand = PackmindCommand & {
  ruleId: RuleId;
};

export type GetAllDetectionProgramsByRuleResponse = {
  programs: DetectionProgram[];
};

export type IGetAllDetectionProgramsByRule = IUseCase<
  GetAllDetectionProgramsByRuleCommand,
  GetAllDetectionProgramsByRuleResponse
>;
