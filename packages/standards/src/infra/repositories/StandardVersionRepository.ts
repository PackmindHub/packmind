import { IStandardVersionRepository } from '../../domain/repositories/IStandardVersionRepository';
import { StandardVersionSchema } from '../schemas/StandardVersionSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import {
  localDataSource,
  AbstractRepository,
  getErrorMessage,
} from '@packmind/node-utils';
import { SpaceId, StandardId, StandardVersion } from '@packmind/types';

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
    super('standardVersion', repository, StandardVersionSchema, logger);
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

  async findLatestByStandardIds(
    standardIds: StandardId[],
  ): Promise<StandardVersion[]> {
    const uniqueStandardIds = [...new Set(standardIds)];

    if (uniqueStandardIds.length === 0) {
      this.logger.info('No standard IDs provided to findLatestByStandardIds');
      return [];
    }

    this.logger.info('Finding latest standard versions by standard IDs', {
      count: uniqueStandardIds.length,
    });

    try {
      // DISTINCT ON keeps a single row per standard at the SQL layer, so the
      // whole version history of a standard never crosses the wire: a standard
      // at version 60 would otherwise hydrate 60 entities, each carrying the
      // full markdown of its `description`, to yield one.
      //
      // No relations: callers of this method want the version row itself, and
      // hydrating `rules` and `gitCommit` for every version of every standard
      // is what makes the per-standard variant expensive.
      const versions = await this.repository
        .createQueryBuilder('standardVersion')
        .where('standardVersion.standardId IN (:...standardIds)', {
          standardIds: uniqueStandardIds as string[],
        })
        .distinctOn(['standardVersion.standardId'])
        .orderBy('standardVersion.standardId', 'ASC')
        .addOrderBy('standardVersion.version', 'DESC')
        .getMany();

      this.logger.info('Latest standard versions found by standard IDs', {
        requestedCount: uniqueStandardIds.length,
        foundCount: versions.length,
      });

      return versions;
    } catch (error) {
      this.logger.error(
        'Failed to find latest standard versions by standard IDs',
        {
          count: uniqueStandardIds.length,
          error: getErrorMessage(error),
        },
      );
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
    allowedSpaceIds: SpaceId[],
  ): Promise<StandardVersion | null> {
    this.logger.info('Finding standard version by standard ID and version', {
      standardId,
      version,
      spaceIdCount: allowedSpaceIds.length,
    });

    if (allowedSpaceIds.length === 0) {
      this.logger.warn('No allowed space IDs provided, returning null', {
        standardId,
        version,
      });
      return null;
    }

    try {
      const standardVersion = await this.repository
        .createQueryBuilder('sv')
        .innerJoin('sv.standard', 'standard')
        .where('sv.standard_id = :standardId', { standardId })
        .andWhere('sv.version = :version', { version })
        .andWhere('standard.space_id IN (:...allowedSpaceIds)', {
          allowedSpaceIds,
        })
        .getOne();

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
}
