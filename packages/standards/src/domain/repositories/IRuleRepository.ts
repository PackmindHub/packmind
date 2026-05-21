import {
  IRepository,
  Rule,
  RuleId,
  SpaceId,
  StandardVersionId,
} from '@packmind/types';

export interface IRuleRepository extends IRepository<Rule> {
  findByStandardVersionId(
    standardVersionId: StandardVersionId,
  ): Promise<Rule[]>;

  findByStandardVersionIds(
    standardVersionIds: StandardVersionId[],
  ): Promise<Rule[]>;

  findByIdInSpace(ruleId: RuleId, spaceId: SpaceId): Promise<Rule | null>;
}
