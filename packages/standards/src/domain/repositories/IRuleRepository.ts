import { IRepository, Rule, StandardVersionId } from '@packmind/types';

export interface IRuleRepository extends IRepository<Rule> {
  findByStandardVersionId(
    standardVersionId: StandardVersionId,
  ): Promise<Rule[]>;
}
