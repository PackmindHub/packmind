import { IStandardVersionRepository } from '../../domain/repositories/IStandardVersionRepository';
import { StandardVersionSchema } from '../schemas/StandardVersionSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import {
  localDataSource,
  AbstractRepository,
  getErrorMessage,
} from '@packmind/node-utils';
import {
  SpaceId,
  StandardId,
  StandardVersion,
  StandardVersionId,
} from '@packmind/types';

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

  async updateEmbedding(
    standardVersionId: StandardVersionId,
    embedding: number[],
  ): Promise<void> {
    this.logger.info('Updating embedding for standard version', {
      standardVersionId,
      embeddingDimensions: embedding.length,
    });

    try {
      // Convert number array to pgvector format string
      const embeddingString = `[${embedding.join(',')}]`;

      const result = await this.repository.update(
        { id: standardVersionId },
        { embedding: embeddingString as unknown as number[] },
      );

      if (result.affected === 0) {
        const errorMessage = `No standard version found with id ${standardVersionId}`;
        this.logger.error('Failed to update embedding - version not found', {
          standardVersionId,
        });
        throw new Error(errorMessage);
      }

      this.logger.info('Embedding updated successfully', {
        standardVersionId,
      });
    } catch (error) {
      this.logger.error('Failed to update embedding', {
        standardVersionId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findSimilarByEmbedding(
    embedding: number[],
    spaceId?: SpaceId,
    threshold = 0.7,
  ): Promise<Array<StandardVersion & { similarity: number }>> {
    this.logger.info('Finding similar standard versions by embedding', {
      embeddingDimensions: embedding.length,
      spaceId,
      threshold,
    });

    try {
      const embeddingString = `[${embedding.join(',')}]`;

      let query = this.repository
        .createQueryBuilder('standard_version')
        .select('standard_version.*')
        .addSelect(
          `(standard_version.embedding <#> '${embeddingString}'::vector) * -1`,
          'similarity',
        )
        .where('standard_version.embedding IS NOT NULL')
        .andWhere(
          `(standard_version.embedding <#> '${embeddingString}'::vector) * -1 >= :threshold`,
          { threshold },
        );

      if (spaceId) {
        query = query
          .innerJoin(
            'standards',
            'standard',
            'standard_version.standard_id = standard.id',
          )
          .andWhere('standard.space_id = :spaceId', { spaceId });
      }

      const results = await query.orderBy('similarity', 'DESC').getRawMany();

      this.logger.info('Similar standard versions found', {
        count: results.length,
        spaceId,
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to find similar standard versions', {
        spaceId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findLatestVersionsWhereEmbeddingIsNull(
    spaceId?: SpaceId,
  ): Promise<StandardVersion[]> {
    this.logger.info('Finding latest standard versions without embeddings', {
      spaceId,
    });

    try {
      // Get all versions without embeddings
      let allVersionsQuery = this.repository
        .createQueryBuilder('standard_version')
        .where('standard_version.embedding IS NULL');

      if (spaceId) {
        allVersionsQuery = allVersionsQuery
          .innerJoin(
            'standards',
            'standard',
            'standard_version.standard_id = standard.id',
          )
          .andWhere('standard.space_id = :spaceId', { spaceId });
      }

      const versionsWithoutEmbeddings = await allVersionsQuery.getMany();

      // Group by standard_id and find the latest version for each
      const latestVersionsMap = new Map<string, StandardVersion>();

      for (const version of versionsWithoutEmbeddings) {
        const standardId = version.standardId;
        const existing = latestVersionsMap.get(standardId);

        if (!existing || version.version > existing.version) {
          latestVersionsMap.set(standardId, version);
        }
      }

      const results = Array.from(latestVersionsMap.values());

      this.logger.info('Latest standard versions without embeddings found', {
        count: results.length,
        spaceId,
      });

      return results;
    } catch (error) {
      this.logger.error(
        'Failed to find latest standard versions without embeddings',
        {
          spaceId,
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  async findAllLatestVersions(spaceId?: SpaceId): Promise<StandardVersion[]> {
    this.logger.info('Finding all latest standard versions', { spaceId });

    try {
      // Get all versions, optionally filtered by space
      let allVersionsQuery =
        this.repository.createQueryBuilder('standard_version');

      if (spaceId) {
        allVersionsQuery = allVersionsQuery
          .innerJoin(
            'standards',
            'standard',
            'standard_version.standard_id = standard.id',
          )
          .andWhere('standard.space_id = :spaceId', { spaceId });
      }

      const allVersions = await allVersionsQuery.getMany();

      // Group by standard_id and find the latest version for each
      const latestVersionsMap = new Map<string, StandardVersion>();

      for (const version of allVersions) {
        const standardId = version.standardId;
        const existing = latestVersionsMap.get(standardId);

        if (!existing || version.version > existing.version) {
          latestVersionsMap.set(standardId, version);
        }
      }

      const results = Array.from(latestVersionsMap.values());

      this.logger.info('All latest standard versions found', {
        count: results.length,
        spaceId,
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to find all latest standard versions', {
        spaceId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }
}
