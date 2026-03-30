import { PackmindCommand, IUseCase } from '../../UseCase';
import { RuleId } from '../../standards';

export type SoftDeleteLinterArtefactsByRuleCommand = PackmindCommand & {
  ruleId: RuleId;
};

export type SoftDeleteLinterArtefactsByRuleResponse = void;

export type ISoftDeleteLinterArtefactsByRule = IUseCase<
  SoftDeleteLinterArtefactsByRuleCommand,
  SoftDeleteLinterArtefactsByRuleResponse
>;
