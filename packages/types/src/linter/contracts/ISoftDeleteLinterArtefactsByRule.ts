import { PackmindCommand, IUseCase } from '../../UseCase';
import { RuleId } from '../../standards';

export type SoftDeleteLinterArtefactsByRuleCommand = PackmindCommand & {
  ruleId: RuleId;
};

export type SoftDeleteLinterArtefactsByRuleResponse = Record<string, never>;

export type ISoftDeleteLinterArtefactsByRule = IUseCase<
  SoftDeleteLinterArtefactsByRuleCommand,
  SoftDeleteLinterArtefactsByRuleResponse
>;
