import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { AbstractRepository, localDataSource } from '@packmind/node-utils';
import {
  QueryOption,
  DetectionProgramMetadata,
  DetectionProgramId,
  ExecutionLog,
  TokensUsed,
} from '@packmind/types';
import { IDetectionProgramMetadataRepository } from '../../domain/repositories/IDetectionProgramMetadataRepository';
import { DetectionProgramMetadataSchema } from '../schemas/DetectionProgramMetadataSchema';
import { ExecutionLogSchema } from '../schemas/ExecutionLogSchema';
import { v4 as uuidv4 } from 'uuid';

const origin = 'DetectionProgramMetadataRepository';

export class DetectionProgramMetadataRepository
  extends AbstractRepository<DetectionProgramMetadata>
  implements IDetectionProgramMetadataRepository
{
  private readonly executionLogRepository: Repository<
    ExecutionLog & { id: string; detectionProgramMetadataId: string }
  >;

  constructor(
    repository: Repository<DetectionProgramMetadata> = localDataSource.getRepository<DetectionProgramMetadata>(
      DetectionProgramMetadataSchema,
    ),
    executionLogRepository: Repository<
      ExecutionLog & { id: string; detectionProgramMetadataId: string }
    > = localDataSource.getRepository(ExecutionLogSchema),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(
      'detectionProgramMetadata',
      repository,
      DetectionProgramMetadataSchema,
      logger,
    );
    this.executionLogRepository = executionLogRepository;
    this.logger.info('DetectionProgramMetadataRepository initialized');
  }

  protected override loggableEntity(
    entity: DetectionProgramMetadata,
  ): Partial<DetectionProgramMetadata> {
    return {
      id: entity.id,
      detectionProgramId: entity.detectionProgramId,
      taskId: entity.taskId,
    };
  }

  async findByDetectionProgramId(
    detectionProgramId: DetectionProgramId,
    opts?: QueryOption,
  ): Promise<DetectionProgramMetadata | null> {
    this.logger.info('Finding metadata by detection program ID', {
      detectionProgramId,
    });

    try {
      const metadata = await this.repository.findOne({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          detectionProgramId: detectionProgramId as any,
        },
        relations: ['logs'],
        withDeleted: opts?.includeDeleted ?? false,
      });

      if (metadata) {
        this.logger.info('Metadata found by detection program ID', {
          detectionProgramId,
          metadataId: metadata.id,
        });
      } else {
        this.logger.info('Metadata not found by detection program ID', {
          detectionProgramId,
        });
      }

      return metadata;
    } catch (error) {
      this.logger.error('Failed to find metadata by detection program ID', {
        detectionProgramId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async addLog(
    log: ExecutionLog,
    detectionProgramId: DetectionProgramId,
  ): Promise<void> {
    this.logger.info('Adding execution log to metadata', {
      detectionProgramId,
    });

    try {
      let metadata = await this.findByDetectionProgramId(detectionProgramId);

      if (!metadata) {
        this.logger.info(
          'Detection program metadata not found, creating new entry',
          {
            detectionProgramId,
          },
        );

        metadata = {
          id: uuidv4(),
          detectionProgramId,
          taskId: '',
          tokens: null,
          logs: null,
          programDescription: '',
        };

        await this.add(metadata);
      }

      await this.executionLogRepository.save({
        ...log,
        id: uuidv4(),
        detectionProgramMetadataId: metadata.id,
      });

      this.logger.info('Execution log added successfully', {
        detectionProgramId,
        metadataId: metadata.id,
      });
    } catch (error) {
      this.logger.error('Failed to add execution log', {
        detectionProgramId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateProgramDescription(
    programDescription: string,
    detectionProgramId: DetectionProgramId,
  ): Promise<void> {
    this.logger.info('Updating program description', {
      detectionProgramId,
    });

    try {
      let metadata = await this.findByDetectionProgramId(detectionProgramId);

      if (!metadata) {
        this.logger.info(
          'Detection program metadata not found, creating new entry',
          {
            detectionProgramId,
          },
        );

        metadata = {
          id: uuidv4(),
          detectionProgramId,
          taskId: '',
          tokens: null,
          logs: null,
          programDescription,
        };

        await this.add(metadata);
        this.logger.info('Program description set successfully on new entry', {
          detectionProgramId,
          metadataId: metadata.id,
        });
        return;
      }

      await this.repository.update(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: metadata.id as any },
        { programDescription },
      );

      this.logger.info('Program description updated successfully', {
        detectionProgramId,
        metadataId: metadata.id,
      });
    } catch (error) {
      this.logger.error('Failed to update program description', {
        detectionProgramId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateTokensUsed(
    tokens: TokensUsed,
    detectionProgramId: DetectionProgramId,
  ): Promise<void> {
    this.logger.info('Updating tokens used', {
      detectionProgramId,
    });

    try {
      let metadata = await this.findByDetectionProgramId(detectionProgramId);

      if (!metadata) {
        this.logger.info(
          'Detection program metadata not found, creating new entry',
          {
            detectionProgramId,
          },
        );

        metadata = {
          id: uuidv4(),
          detectionProgramId,
          taskId: '',
          tokens,
          logs: null,
          programDescription: '',
        };

        await this.add(metadata);
        this.logger.info('Tokens used set successfully on new entry', {
          detectionProgramId,
          metadataId: metadata.id,
        });
        return;
      }

      await this.repository.update(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: metadata.id as any },
        { tokens },
      );

      this.logger.info('Tokens used updated successfully', {
        detectionProgramId,
        metadataId: metadata.id,
      });
    } catch (error) {
      this.logger.error('Failed to update tokens used', {
        detectionProgramId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
