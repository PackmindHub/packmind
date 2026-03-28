import { RuleId } from '../../standards';

export type SoftDeleteLinterArtefactsByRuleCommand = {
  ruleId: RuleId;
};

export type SoftDeleteLinterArtefactsByRuleResponse = void;

export interface ISoftDeleteLinterArtefactsByRule {
  execute(
    command: SoftDeleteLinterArtefactsByRuleCommand,
  ): Promise<SoftDeleteLinterArtefactsByRuleResponse>;
}
