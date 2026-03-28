import { IUseCase } from '../../UseCase';
import { RuleId } from '../../standards';

export type SoftDeleteLinterArtefactsByRuleCommand = {
  ruleId: RuleId;
};

export type SoftDeleteLinterArtefactsByRuleResponse = void;

export type ISoftDeleteLinterArtefactsByRule = IUseCase<
  SoftDeleteLinterArtefactsByRuleCommand,
  SoftDeleteLinterArtefactsByRuleResponse
>;
