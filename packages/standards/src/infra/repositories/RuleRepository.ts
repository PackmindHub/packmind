import { IRuleRepository } from '../../domain/repositories/IRuleRepository';
import { RuleSchema } from '../schemas/RuleSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import { Rule, SpaceId, StandardVersionId } from '@packmind/types';

const origin = 'RuleRepository';

export class RuleRepository
  extends AbstractRepository<Rule>
  implements IRuleRepository
{
  constructor(
    repository: Repository<Rule> = localDataSource.getRepository<Rule>(
      RuleSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('rule', repository, RuleSchema, logger);
    this.logger.info('RuleRepository initialized');
  }

  protected override loggableEntity(entity: Rule): Partial<Rule> {
    return {
      id: entity.id,
      standardVersionId: entity.standardVersionId,
      content: entity.content.substring(0, 100) + '...', // Log first 100 chars
    };
  }

  async findByIdInSpace(
    ruleId: Rule['id'],
    spaceId: SpaceId,
  ): Promise<Rule | null> {
    this.logger.info('Finding rule by id in space', { ruleId, spaceId });

    return this.repository
      .createQueryBuilder('rule')
      .innerJoin('rule.standardVersion', 'sv')
      .innerJoin('sv.standard', 'standard')
      .where('rule.id = :ruleId', { ruleId })
      .andWhere('standard.spaceId = :spaceId', { spaceId })
      .getOne();
  }

  async findByStandardVersionId(
    standardVersionId: StandardVersionId,
  ): Promise<Rule[]> {
    this.logger.info('Finding rules by standard version ID', {
      standardVersionId,
    });

    try {
      const rules = await this.repository.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { standardVersionId: standardVersionId as any }, // TypeORM compatibility with branded types
      });
      this.logger.info('Rules found by standard version ID', {
        standardVersionId,
        count: rules.length,
      });
      return rules;
    } catch (error) {
      this.logger.error('Failed to find rules by standard version ID', {
        standardVersionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
