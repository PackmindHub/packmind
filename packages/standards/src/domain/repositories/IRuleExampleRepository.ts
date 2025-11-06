import { IRepository } from '@packmind/types';
import { RuleExample } from '../entities/RuleExample';
import { RuleId } from '../entities/Rule';

export interface IRuleExampleRepository extends IRepository<RuleExample> {
  findByRuleId(ruleId: RuleId): Promise<RuleExample[]>;
  updateById(id: string, updates: Partial<RuleExample>): Promise<RuleExample>;
}
