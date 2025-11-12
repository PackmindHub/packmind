import { IUseCase, PackmindCommand } from '../../UseCase';
import { RuleId } from '../../standards';

export type CopyDetectionHeuristicsCommand = PackmindCommand & {
  oldRuleId: RuleId;
  newRuleId: RuleId;
};

export type CopyDetectionHeuristicsResponse = {
  copiedHeuristicsCount: number;
};

export type ICopyDetectionHeuristics = IUseCase<
  CopyDetectionHeuristicsCommand,
  CopyDetectionHeuristicsResponse
>;
