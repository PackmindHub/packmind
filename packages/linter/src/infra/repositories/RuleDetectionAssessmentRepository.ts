import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { AbstractRepository, localDataSource } from '@packmind/node-utils';
import { RuleId } from '@packmind/types';
import { ProgrammingLanguage } from '@packmind/types';
import { RuleDetectionAssessment } from '@packmind/types';
import { IRuleDetectionAssessmentRepository } from '../../domain/repositories/IRuleDetectionAssessmentRepository';
import { RuleDetectionAssessmentSchema } from '../schemas/RuleDetectionAssessmentSchema';

const origin = 'RuleDetectionAssessmentRepository';

export class RuleDetectionAssessmentRepository
  extends AbstractRepository<RuleDetectionAssessment>
  implements IRuleDetectionAssessmentRepository
{
  constructor(
    repository: Repository<RuleDetectionAssessment> = localDataSource.getRepository<RuleDetectionAssessment>(
      RuleDetectionAssessmentSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(
      'ruleDetectionAssessment',
      repository,
      RuleDetectionAssessmentSchema,
      logger,
    );
    this.logger.info('RuleDetectionAssessmentRepository initialized');
  }

  protected override loggableEntity(
    entity: RuleDetectionAssessment,
  ): Partial<RuleDetectionAssessment> {
    return {
      id: entity.id,
      ruleId: entity.ruleId,
      language: entity.language,
      status: entity.status,
    };
  }

  async get(
    ruleId: RuleId,
    language: ProgrammingLanguage,
  ): Promise<RuleDetectionAssessment | null> {
    this.logger.info(
      'Getting rule detection assessment by ruleId and language',
      {
        ruleId,
        language,
      },
    );

    try {
      const assessment = await this.repository.findOne({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ruleId: ruleId as any, // TypeORM compatibility with branded types
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          language: language as any,
        },
      });

      if (assessment) {
        this.logger.info('Rule detection assessment found', {
          ruleId,
          language,
          assessmentId: assessment.id,
        });
      } else {
        this.logger.info('Rule detection assessment not found', {
          ruleId,
          language,
        });
      }

      return assessment;
    } catch (error) {
      this.logger.error('Failed to get rule detection assessment', {
        ruleId,
        language,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByRuleId(ruleId: RuleId): Promise<RuleDetectionAssessment[]> {
    this.logger.info('Finding all rule detection assessments by ruleId', {
      ruleId,
    });

    try {
      const assessments = await this.repository.find({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ruleId: ruleId as any, // TypeORM compatibility with branded types
        },
      });

      this.logger.info('Rule detection assessments found', {
        ruleId,
        count: assessments.length,
      });

      return assessments;
    } catch (error) {
      this.logger.error('Failed to find rule detection assessments', {
        ruleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async update(
    assessment: RuleDetectionAssessment,
  ): Promise<RuleDetectionAssessment> {
    this.logger.info('Updating rule detection assessment', {
      id: assessment.id,
    });

    try {
      // Verify assessment exists first
      const existing = await this.findById(assessment.id);
      if (!existing) {
        throw new Error(
          `Rule detection assessment with id ${assessment.id} not found`,
        );
      }

      const updatedAssessment = await this.repository.save(assessment);
      this.logger.info(
        'Updated rule detection assessment successfully',
        this.loggableEntity(updatedAssessment),
      );
      return updatedAssessment;
    } catch (error) {
      this.logger.error('Failed to update rule detection assessment', {
        id: assessment.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async softDeleteByRuleId(ruleId: RuleId): Promise<void> {
    this.logger.info('Soft-deleting rule detection assessments by rule ID', {
      ruleId,
    });

    try {
      const result = await this.repository.softDelete({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ruleId: ruleId as any, // TypeORM compatibility with branded types
      });

      this.logger.info('Rule detection assessments soft-deleted by rule ID', {
        ruleId,
        affectedRows: result.affected,
      });
    } catch (error) {
      this.logger.error(
        'Failed to soft-delete rule detection assessments by rule ID',
        {
          ruleId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
