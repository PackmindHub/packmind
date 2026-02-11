import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { AbstractRepository, localDataSource } from '@packmind/node-utils';
import {
  QueryOption,
  ProgrammingLanguage,
  RuleId,
  DetectionStatus,
  DetectionProgram,
  DetectionProgramId,
} from '@packmind/types';
import { IDetectionProgramRepository } from '../../domain/repositories/IDetectionProgramRepository';
import { DetectionProgramSchema } from '../schemas/DetectionProgramSchema';

const origin = 'DetectionProgramRepository';

export class DetectionProgramRepository
  extends AbstractRepository<DetectionProgram>
  implements IDetectionProgramRepository
{
  constructor(
    repository: Repository<DetectionProgram> = localDataSource.getRepository<DetectionProgram>(
      DetectionProgramSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('detectionProgram', repository, DetectionProgramSchema, logger);
    this.logger.info('DetectionProgramRepository initialized');
  }

  protected override loggableEntity(
    entity: DetectionProgram,
  ): Partial<DetectionProgram> {
    return {
      id: entity.id,
      ruleId: entity.ruleId,
      version: entity.version,
      mode: entity.mode,
    };
  }

  async list(): Promise<DetectionProgram[]> {
    this.logger.info('Listing all detection programs from database');

    try {
      const programs = await this.repository.find();
      this.logger.info('Detection programs listed successfully', {
        count: programs.length,
      });
      return programs;
    } catch (error) {
      this.logger.error('Failed to list detection programs from database', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByRuleId(
    ruleId: RuleId,
    opts?: QueryOption,
  ): Promise<DetectionProgram[]> {
    this.logger.info('Finding detection programs by rule ID', { ruleId });

    try {
      const programs = await this.repository.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { ruleId: ruleId as any }, // TypeORM compatibility with branded types
        order: { version: 'DESC' }, // Order by version descending (latest first)
        withDeleted: opts?.includeDeleted ?? false,
      });

      this.logger.info('Detection programs found by rule ID', {
        ruleId,
        count: programs.length,
      });
      return programs;
    } catch (error) {
      this.logger.error('Failed to find detection programs by rule ID', {
        ruleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByRuleIdAndVersion(
    ruleId: RuleId,
    version: number,
    opts?: QueryOption,
  ): Promise<DetectionProgram | null> {
    this.logger.info('Finding detection program by rule ID and version', {
      ruleId,
      version,
    });

    try {
      const program = await this.repository.findOne({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ruleId: ruleId as any, // TypeORM compatibility with branded types
          version,
        },
        withDeleted: opts?.includeDeleted ?? false,
      });

      if (program) {
        this.logger.info('Detection program found by rule ID and version', {
          ruleId,
          version,
          programId: program.id,
        });
      } else {
        this.logger.warn('Detection program not found by rule ID and version', {
          ruleId,
          version,
        });
      }
      return program;
    } catch (error) {
      this.logger.error(
        'Failed to find detection program by rule ID and version',
        {
          ruleId,
          version,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findByRuleIdAndLanguage(
    ruleId: RuleId,
    language: string,
    opts?: QueryOption,
  ): Promise<DetectionProgram | null> {
    this.logger.info('Finding detection program by rule ID and language', {
      ruleId,
      language,
    });

    try {
      const program = await this.repository.findOne({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ruleId: ruleId as any, // TypeORM compatibility with branded types
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          language: language as any,
        },
        order: { version: 'DESC' },
        withDeleted: opts?.includeDeleted ?? false,
      });

      if (program) {
        this.logger.info('Detection program found by rule ID and language', {
          ruleId,
          language,
          programId: program.id,
          version: program.version,
        });
      } else {
        this.logger.info('No detection program found by rule ID and language', {
          ruleId,
          language,
        });
      }
      return program;
    } catch (error) {
      this.logger.error(
        'Failed to find detection program by rule ID and language',
        {
          ruleId,
          language,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async getLatestVersionByRuleIdAndLanguage(
    ruleId: RuleId,
    language: ProgrammingLanguage,
  ): Promise<number> {
    this.logger.info('Getting latest version by rule ID', { ruleId });

    try {
      const result = await this.repository
        .createQueryBuilder('detection_program')
        .select('MAX(detection_program.version)', 'maxVersion')
        .where('detection_program.ruleId = :ruleId', { ruleId })
        .andWhere('detection_program.language = :language', { language })
        .andWhere('detection_program.deletedAt IS NULL')
        .getRawOne();

      const latestVersion = result?.maxVersion ?? 0;

      this.logger.info('Latest version found by rule ID', {
        ruleId,
        latestVersion,
      });
      return latestVersion;
    } catch (error) {
      this.logger.error('Failed to get latest version by rule ID', {
        ruleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateStatus(
    detectionProgramId: DetectionProgramId,
    status: DetectionStatus,
  ): Promise<void> {
    this.logger.info('Updating detection program status', {
      detectionProgramId,
      status,
    });

    try {
      await this.repository.update(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: detectionProgramId as any }, // TypeORM compatibility with branded types
        { status },
      );

      this.logger.info('Detection program status updated successfully', {
        detectionProgramId,
        status,
      });
    } catch (error) {
      this.logger.error('Failed to update detection program status', {
        detectionProgramId,
        status,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
