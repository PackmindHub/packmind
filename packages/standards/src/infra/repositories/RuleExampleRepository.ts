import { IRuleExampleRepository } from '../../domain/repositories/IRuleExampleRepository';
import { RuleExampleSchema } from '../schemas/RuleExampleSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import { RuleExample, RuleExampleId, RuleId, SpaceId } from '@packmind/types';

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
    super('ruleExample', repository, RuleExampleSchema, logger);
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

  async findByIdInSpace(
    ruleExampleId: RuleExample['id'],
    spaceId: SpaceId,
  ): Promise<RuleExample | null> {
    this.logger.info('Finding rule example by id in space', {
      ruleExampleId,
      spaceId,
    });

    return this.repository
      .createQueryBuilder('re')
      .innerJoin('re.rule', 'rule')
      .innerJoin('rule.standardVersion', 'sv')
      .innerJoin('sv.standard', 'standard')
      .where('re.id = :ruleExampleId', { ruleExampleId })
      .andWhere('standard.spaceId = :spaceId', { spaceId })
      .getOne();
  }

  async findByRuleIds(ruleIds: RuleId[]): Promise<RuleExample[]> {
    if (ruleIds.length === 0) return [];

    this.logger.info('Finding rule examples by rule IDs', {
      count: ruleIds.length,
    });

    try {
      const ruleExamples = await this.repository
        .createQueryBuilder('ruleExample')
        .where('ruleExample.ruleId IN (:...ruleIds)', {
          ruleIds: ruleIds as string[],
        })
        .getMany();
      this.logger.info('Rule examples found by rule IDs', {
        requestedCount: ruleIds.length,
        foundCount: ruleExamples.length,
      });
      return ruleExamples;
    } catch (error) {
      this.logger.error('Failed to find rule examples by rule IDs', {
        count: ruleIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
