import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { AbstractRepository, localDataSource } from '@packmind/node-utils';
import { RuleId, QueryOption, ProgrammingLanguage } from '@packmind/types';
import {
  ActiveDetectionProgram,
  LanguageDetectionPrograms,
} from '@packmind/types';
import { IActiveDetectionProgramRepository } from '../../domain/repositories/IActiveDetectionProgramRepository';
import { ActiveDetectionProgramSchema } from '../schemas';

const origin = 'ActiveDetectionProgramRepository';

export class ActiveDetectionProgramRepository
  extends AbstractRepository<ActiveDetectionProgram>
  implements IActiveDetectionProgramRepository
{
  constructor(
    repository: Repository<ActiveDetectionProgram> = localDataSource.getRepository<ActiveDetectionProgram>(
      ActiveDetectionProgramSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(
      'activeDetectionProgram',
      repository,
      logger,
      ActiveDetectionProgramSchema,
    );
    this.logger.info('ActiveDetectionProgramRepository initialized');
  }

  protected override loggableEntity(
    entity: ActiveDetectionProgram,
  ): Partial<ActiveDetectionProgram> {
    return {
      id: entity.id,
      ruleId: entity.ruleId,
      language: entity.language,
      detectionProgramVersion: entity.detectionProgramVersion,
    };
  }

  async list(): Promise<ActiveDetectionProgram[]> {
    this.logger.info('Listing all active detection programs from database');

    try {
      const programs = await this.repository.find();
      this.logger.info('Active detection programs listed successfully', {
        count: programs.length,
      });
      return programs;
    } catch (error) {
      this.logger.error(
        'Failed to list active detection programs from database',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findByRuleId(
    ruleId: RuleId,
    opts?: QueryOption,
  ): Promise<ActiveDetectionProgram[]> {
    this.logger.info('Finding active detection programs by rule ID', {
      ruleId,
    });

    try {
      const programs = await this.repository.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { ruleId: ruleId as any }, // TypeORM compatibility with branded types
        withDeleted: opts?.includeDeleted ?? false,
      });

      this.logger.info('Active detection programs found by rule ID', {
        ruleId,
        count: programs.length,
      });
      return programs;
    } catch (error) {
      this.logger.error('Failed to find active detection programs by rule ID', {
        ruleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByRuleIdAndLanguage(
    ruleId: RuleId,
    language: ProgrammingLanguage,
    opts?: QueryOption,
  ): Promise<ActiveDetectionProgram | null> {
    this.logger.info(
      'Finding active detection program by rule ID and language',
      {
        ruleId,
        language,
      },
    );

    try {
      const program = await this.repository.findOne({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ruleId: ruleId as any, // TypeORM compatibility with branded types
          language,
        },
        withDeleted: opts?.includeDeleted ?? false,
      });

      if (program) {
        this.logger.info(
          'Active detection program found by rule ID and language',
          {
            ruleId,
            language,
            programId: program.id,
          },
        );
      } else {
        this.logger.warn(
          'Active detection program not found by rule ID and language',
          {
            ruleId,
            language,
          },
        );
      }
      return program;
    } catch (error) {
      this.logger.error(
        'Failed to find active detection program by rule ID and language',
        {
          ruleId,
          language,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findByRuleIdWithPrograms(
    ruleId: RuleId,
    opts?: QueryOption,
  ): Promise<LanguageDetectionPrograms[]> {
    this.logger.info(
      'Finding active detection programs with programs by rule ID',
      {
        ruleId,
      },
    );

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('active_detection_program')
        .leftJoinAndSelect(
          'active_detection_program.detectionProgram',
          'detection_program',
        )
        .leftJoinAndSelect(
          'active_detection_program.draftDetectionProgram',
          'draft_detection_program',
        )
        .where('active_detection_program.ruleId = :ruleId', { ruleId });

      if (opts?.includeDeleted) {
        queryBuilder.withDeleted();
      }

      const programs = await queryBuilder.getMany();

      this.logger.info(
        'Active detection programs with programs found by rule ID',
        {
          ruleId,
          count: programs.length,
        },
      );

      // TypeScript type assertion to match the expected return type
      return programs as LanguageDetectionPrograms[];
    } catch (error) {
      this.logger.error(
        'Failed to find active detection programs with programs by rule ID',
        {
          ruleId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async updateActiveDetectionProgram(
    activeDetectionProgram: ActiveDetectionProgram,
  ): Promise<ActiveDetectionProgram> {
    this.logger.info('Updating active detection program', {
      id: activeDetectionProgram.id,
    });

    try {
      const updatedProgram = await this.repository.save(activeDetectionProgram);
      this.logger.info('Active detection program updated', {
        id: updatedProgram.id,
      });
      return updatedProgram;
    } catch (error) {
      this.logger.error('Failed to update active detection program', {
        id: activeDetectionProgram.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteByRuleId(ruleId: RuleId): Promise<void> {
    this.logger.info('Deleting active detection programs by rule ID', {
      ruleId,
    });

    try {
      const result = await this.repository.softDelete({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ruleId: ruleId as any, // TypeORM compatibility with branded types
      });

      this.logger.info('Active detection programs deleted by rule ID', {
        ruleId,
        affectedRows: result.affected,
      });
    } catch (error) {
      this.logger.error(
        'Failed to delete active detection programs by rule ID',
        {
          ruleId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
