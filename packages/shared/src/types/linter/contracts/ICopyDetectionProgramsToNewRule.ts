import { IUseCase, PackmindCommand } from '../../UseCase';
import { RuleId } from '../../standards/Rule';

export type CopyDetectionProgramsToNewRuleCommand = PackmindCommand & {
  oldRuleId: RuleId;
  newRuleId: RuleId;
};

export type CopyDetectionProgramsToNewRuleResponse = {
  copiedProgramsCount: number;
};

export type ICopyDetectionProgramsToNewRule = IUseCase<
  CopyDetectionProgramsToNewRuleCommand,
  CopyDetectionProgramsToNewRuleResponse
>;
