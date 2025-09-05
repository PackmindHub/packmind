import { IRepository } from '@packmind/shared';
import { RuleExample } from '../entities/RuleExample';
import { RuleId } from '../entities/Rule';

export interface IRuleExampleRepository extends IRepository<RuleExample> {
  findByRuleId(ruleId: RuleId): Promise<RuleExample[]>;
  updateById(id: string, updates: Partial<RuleExample>): Promise<RuleExample>;
}
