import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { AbstractRepository, localDataSource } from '@packmind/node-utils';
import {
  RuleId,
  DetectionHeuristics,
  ProgrammingLanguage,
  DetectionHeuristicsId,
} from '@packmind/types';
import { IRuleDetectionHeuristicsRepository } from '../../domain/repositories/IRuleDetectionHeuristicsRepository';
import { DetectionHeuristicsSchema } from '../schemas/DetectionHeuristicsSchema';

const origin = 'RuleDetectionHeuristicsRepository';

export class RuleDetectionHeuristicsRepository
  extends AbstractRepository<DetectionHeuristics>
  implements IRuleDetectionHeuristicsRepository
{
  constructor(
    repository: Repository<DetectionHeuristics> = localDataSource.getRepository<DetectionHeuristics>(
      DetectionHeuristicsSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('detectionHeuristics', repository, DetectionHeuristicsSchema, logger);
    this.logger.info('RuleDetectionHeuristicsRepository initialized');
  }

  protected override loggableEntity(
    entity: DetectionHeuristics,
  ): Partial<DetectionHeuristics> {
    return {
      id: entity.id,
      ruleId: entity.ruleId,
      language: entity.language,
    };
  }

  async upsertHeuristics(heuristic: DetectionHeuristics): Promise<void> {
    this.logger.info('Upserting detection heuristics', {
      ruleId: heuristic.ruleId,
      language: heuristic.language,
    });

    try {
      await this.repository.save(heuristic);
      this.logger.info('Detection heuristics upserted successfully', {
        id: heuristic.id,
        ruleId: heuristic.ruleId,
        language: heuristic.language,
      });
    } catch (error) {
      this.logger.error('Failed to upsert detection heuristics', {
        ruleId: heuristic.ruleId,
        language: heuristic.language,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getHeuristicsForRule(
    ruleId: RuleId,
    language: ProgrammingLanguage,
  ): Promise<DetectionHeuristics | null> {
    this.logger.info('Getting detection heuristics by ruleId and language', {
      ruleId,
      language,
    });

    try {
      const heuristics = await this.repository.findOne({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ruleId: ruleId as any, // TypeORM compatibility with branded types
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          language: language as any,
        },
      });

      if (heuristics) {
        this.logger.info('Detection heuristics found', {
          ruleId,
          language,
          heuristicsId: heuristics.id,
        });
      } else {
        this.logger.info('Detection heuristics not found', {
          ruleId,
          language,
        });
      }

      return heuristics;
    } catch (error) {
      this.logger.error('Failed to get detection heuristics', {
        ruleId,
        language,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getAllHeuristicsForRule(
    ruleId: RuleId,
  ): Promise<DetectionHeuristics[]> {
    this.logger.info('Getting all detection heuristics for rule', { ruleId });

    try {
      const heuristics = await this.repository.find({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ruleId: ruleId as any, // TypeORM compatibility with branded types
        },
      });

      this.logger.info('Detection heuristics found for rule', {
        ruleId,
        count: heuristics.length,
      });

      return heuristics;
    } catch (error) {
      this.logger.error('Failed to get all detection heuristics for rule', {
        ruleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateHeuristics(
    id: DetectionHeuristicsId,
    heuristics: string[],
  ): Promise<void> {
    this.logger.info('Updating detection heuristics', { id });

    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Detection heuristics with id ${id} not found`);
      }

      const updated: DetectionHeuristics = {
        ...existing,
        heuristics,
      };

      await this.repository.save(updated);
      this.logger.info('Detection heuristics updated successfully', { id });
    } catch (error) {
      this.logger.error('Failed to update detection heuristics', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getHeuristicsById(
    id: DetectionHeuristicsId,
  ): Promise<DetectionHeuristics | null> {
    return this.findById(id);
  }

  async softDeleteByRuleId(ruleId: RuleId): Promise<void> {
    this.logger.info('Soft-deleting detection heuristics by rule ID', {
      ruleId,
    });

    try {
      const result = await this.repository.softDelete({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ruleId: ruleId as any, // TypeORM compatibility with branded types
      });

      this.logger.info('Detection heuristics soft-deleted by rule ID', {
        ruleId,
        affectedRows: result.affected,
      });
    } catch (error) {
      this.logger.error(
        'Failed to soft-delete detection heuristics by rule ID',
        {
          ruleId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
