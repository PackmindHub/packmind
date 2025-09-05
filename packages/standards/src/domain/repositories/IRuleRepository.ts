import { Rule } from '../entities/Rule';
import { IRepository } from '@packmind/shared';
import { StandardVersionId } from '../entities/StandardVersion';

export interface IRuleRepository extends IRepository<Rule> {
  findByStandardVersionId(
    standardVersionId: StandardVersionId,
  ): Promise<Rule[]>;
}
