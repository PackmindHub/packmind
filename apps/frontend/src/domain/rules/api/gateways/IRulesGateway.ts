import { RuleExample, RuleExampleId } from '@packmind/standards/types';
import { RuleId } from '@packmind/shared/types';

export interface IRulesGateway {
  createRuleExample(
    standardId: string,
    ruleId: RuleId,
    example: {
      lang: string;
      positive: string;
      negative: string;
    },
  ): Promise<RuleExample>;

  getRuleExamples(standardId: string, ruleId: RuleId): Promise<RuleExample[]>;

  updateRuleExample(
    standardId: string,
    ruleId: RuleId,
    exampleId: RuleExampleId,
    updates: {
      lang?: string;
      positive?: string;
      negative?: string;
    },
  ): Promise<RuleExample>;

  deleteRuleExample(
    standardId: string,
    ruleId: RuleId,
    exampleId: RuleExampleId,
  ): Promise<void>;
}
