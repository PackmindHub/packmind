import { IUseCase, PackmindCommand } from '../../UseCase';
import { RuleId } from '../../standards';

export type MoveLinterArtefactsToNewRulesCommand = PackmindCommand & {
  ruleMappings: Array<{ oldRuleId: RuleId; newRuleId: RuleId }>;
};

export type MoveLinterArtefactsToNewRulesResponse = {
  copiedCount: number;
  softDeletedCount: number;
};

export type IMoveLinterArtefactsToNewRules = IUseCase<
  MoveLinterArtefactsToNewRulesCommand,
  MoveLinterArtefactsToNewRulesResponse
>;
