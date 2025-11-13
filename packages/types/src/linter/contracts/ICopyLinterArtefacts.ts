import { IUseCase, PackmindCommand } from '../../UseCase';
import { RuleId } from '../../standards';

export type CopyLinterArtefactsCommand = PackmindCommand & {
  oldRuleId: RuleId;
  newRuleId: RuleId;
};

export type CopyLinterArtefactsResponse = {
  copiedHeuristicsCount: number;
  copiedAssessmentsCount: number;
  copiedProgramsCount: number;
};

export type ICopyLinterArtefacts = IUseCase<
  CopyLinterArtefactsCommand,
  CopyLinterArtefactsResponse
>;
