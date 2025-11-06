import {
  StandardVersion,
  StandardVersionId,
} from '../../domain/entities/StandardVersion';
import { StandardId } from '../../domain/entities/Standard';
import { IStandardVersionRepository } from '../../domain/repositories/IStandardVersionRepository';
import { StandardVersionSchema } from '../schemas/StandardVersionSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import {
  localDataSource,
  AbstractRepository,
  getErrorMessage,
} from '@packmind/node-utils';

const origin = 'StandardVersionRepository';

export class StandardVersionRepository
  extends AbstractRepository<StandardVersion>
  implements IStandardVersionRepository
{
  constructor(
    repository: Repository<StandardVersion> = localDataSource.getRepository<StandardVersion>(
      StandardVersionSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('standardVersion', repository, logger, StandardVersionSchema);
    this.logger.info('StandardVersionRepository initialized');
  }

  protected override loggableEntity(
    entity: StandardVersion,
  ): Partial<StandardVersion> {
    return {
      id: entity.id,
      standardId: entity.standardId,
      version: entity.version,
      name: entity.name,
    };
  }

  async list(): Promise<StandardVersion[]> {
    this.logger.info('Listing all standard versions from database');

    try {
      const versions = await this.repository.find();
      this.logger.info('Standard versions listed successfully', {
        count: versions.length,
      });
      return versions;
    } catch (error) {
      this.logger.error('Failed to list standard versions from database', {
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findByStandardId(standardId: StandardId): Promise<StandardVersion[]> {
    this.logger.info('Finding standard versions by standard ID', {
      standardId,
    });

    try {
      const versions = await this.repository.find({
        where: { standardId },
        order: { version: 'DESC' },
        relations: ['gitCommit', 'rules'],
      });
      this.logger.info('Standard versions found by standard ID', {
        standardId,
        count: versions.length,
      });
      return versions;
    } catch (error) {
      this.logger.error('Failed to find standard versions by standard ID', {
        standardId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findLatestByStandardId(
    standardId: StandardId,
  ): Promise<StandardVersion | null> {
    this.logger.info('Finding latest standard version by standard ID', {
      standardId,
    });

    try {
      const versions = await this.findByStandardId(standardId);
      const latestVersion = versions.length > 0 ? versions[0] : null;

      if (latestVersion) {
        this.logger.info('Latest standard version found', {
          standardId,
          versionId: latestVersion.id,
          version: latestVersion.version,
        });
      } else {
        this.logger.warn('No standard versions found for standard', {
          standardId,
        });
      }

      return latestVersion;
    } catch (error) {
      this.logger.error(
        'Failed to find latest standard version by standard ID',
        {
          standardId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findByStandardIdAndVersion(
    standardId: StandardId,
    version: number,
  ): Promise<StandardVersion | null> {
    this.logger.info('Finding standard version by standard ID and version', {
      standardId,
      version,
    });

    try {
      const standardVersion = await this.repository.findOne({
        where: { standardId, version },
      });

      if (standardVersion) {
        this.logger.info('Standard version found by standard ID and version', {
          standardId,
          version,
          versionId: standardVersion.id,
        });
      } else {
        this.logger.warn(
          'Standard version not found by standard ID and version',
          {
            standardId,
            version,
          },
        );
      }

      return standardVersion;
    } catch (error) {
      this.logger.error(
        'Failed to find standard version by standard ID and version',
        {
          standardId,
          version,
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  async updateSummary(
    standardVersionId: StandardVersionId,
    summary: string,
  ): Promise<number | undefined> {
    const result = await this.repository.update(
      {
        id: standardVersionId,
      },
      {
        summary,
      },
    );
    return result.affected;
  }
}
