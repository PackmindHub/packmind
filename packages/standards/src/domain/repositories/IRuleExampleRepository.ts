import {
  IRepository,
  RuleExample,
  RuleExampleId,
  RuleId,
  SpaceId,
} from '@packmind/types';

export interface IRuleExampleRepository extends IRepository<RuleExample> {
  findByRuleId(ruleId: RuleId): Promise<RuleExample[]>;
  findByRuleIds(ruleIds: RuleId[]): Promise<RuleExample[]>;
  updateById(id: string, updates: Partial<RuleExample>): Promise<RuleExample>;
  findByIdInSpace(
    ruleExampleId: RuleExampleId,
    spaceId: SpaceId,
  ): Promise<RuleExample | null>;
}
