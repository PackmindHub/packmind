import { RuleExample } from '../../domain/entities/RuleExample';
import { IRuleExampleRepository } from '../../domain/repositories/IRuleExampleRepository';
import { RuleExampleSchema } from '../schemas/RuleExampleSchema';
import { Repository } from 'typeorm';
import {
  PackmindLogger,
  localDataSource,
  AbstractRepository,
  RuleExampleId,
} from '@packmind/shared';
import { RuleId } from '../../domain/entities/Rule';

const origin = 'RuleExampleRepository';

export class RuleExampleRepository
  extends AbstractRepository<RuleExample>
  implements IRuleExampleRepository
{
  constructor(
    repository: Repository<RuleExample> = localDataSource.getRepository<RuleExample>(
      RuleExampleSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('ruleExample', repository, logger, RuleExampleSchema);
    this.logger.info('RuleExampleRepository initialized');
  }

  protected override loggableEntity(entity: RuleExample): Partial<RuleExample> {
    return {
      id: entity.id,
      ruleId: entity.ruleId,
      lang: entity.lang,
      positive: entity.positive.substring(0, 100) + '...', // Log first 100 chars
      negative: entity.negative.substring(0, 100) + '...', // Log first 100 chars
    };
  }

  async findByRuleId(ruleId: RuleId): Promise<RuleExample[]> {
    this.logger.info('Finding rule examples by rule ID', {
      ruleId,
    });

    try {
      const ruleExamples = await this.repository.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { ruleId: ruleId as any }, // TypeORM compatibility with branded types
      });
      this.logger.info('Rule examples found by rule ID', {
        ruleId,
        count: ruleExamples.length,
      });
      return ruleExamples;
    } catch (error) {
      this.logger.error('Failed to find rule examples by rule ID', {
        ruleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateById(
    id: string,
    updates: Partial<RuleExample>,
  ): Promise<RuleExample> {
    this.logger.info('Updating rule example by ID', { id, updates });

    try {
      // Find the existing example
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingExample = await this.repository.findOneBy({ id } as any);
      if (!existingExample) {
        throw new Error(`Rule example with id ${id} not found`);
      }

      // Merge the updates
      const updatedExample: RuleExample = {
        ...existingExample,
        ...updates,
        id: id as RuleExampleId, // Ensure ID is preserved with correct type
      };

      // Save the updated example
      const result = await this.repository.save(updatedExample);

      this.logger.info('Rule example updated successfully', { id });
      return result;
    } catch (error) {
      this.logger.error('Failed to update rule example', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
