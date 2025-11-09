import { IRepository, RuleExample, RuleId } from '@packmind/types';

export interface IRuleExampleRepository extends IRepository<RuleExample> {
  findByRuleId(ruleId: RuleId): Promise<RuleExample[]>;
  updateById(id: string, updates: Partial<RuleExample>): Promise<RuleExample>;
}
