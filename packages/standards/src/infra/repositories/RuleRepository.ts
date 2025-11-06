import { Rule } from '../../domain/entities/Rule';
import { IRuleRepository } from '../../domain/repositories/IRuleRepository';
import { RuleSchema } from '../schemas/RuleSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import { StandardVersionId } from '../../domain/entities/StandardVersion';

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
    super('rule', repository, logger, RuleSchema);
    this.logger.info('RuleRepository initialized');
  }

  protected override loggableEntity(entity: Rule): Partial<Rule> {
    return {
      id: entity.id,
      standardVersionId: entity.standardVersionId,
      content: entity.content.substring(0, 100) + '...', // Log first 100 chars
    };
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
