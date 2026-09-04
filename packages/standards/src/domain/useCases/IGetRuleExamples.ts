import { PackmindCommand, RuleId } from '@packmind/types';
export type GetRuleExamplesCommand = PackmindCommand & {
  ruleId: RuleId;
};
