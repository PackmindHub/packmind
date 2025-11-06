import { Rule } from '../entities/Rule';
import { IRepository } from '@packmind/types';
import { StandardVersionId } from '../entities/StandardVersion';

export interface IRuleRepository extends IRepository<Rule> {
  findByStandardVersionId(
    standardVersionId: StandardVersionId,
  ): Promise<Rule[]>;
}
