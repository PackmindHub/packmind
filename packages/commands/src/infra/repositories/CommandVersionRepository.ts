import { ICommandVersionRepository } from '../../domain/repositories/ICommandVersionRepository';
import { CommandVersionSchema } from '../schemas/CommandVersionSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import {
  localDataSource,
  AbstractRepository,
  getErrorMessage,
} from '@packmind/node-utils';
import { CommandId, CommandVersion, SpaceId } from '@packmind/types';

const origin = 'RecipeVersionRepository';

export class CommandVersionRepository
  extends AbstractRepository<CommandVersion>
  implements ICommandVersionRepository
{
  constructor(
    repository: Repository<CommandVersion> = localDataSource.getRepository<CommandVersion>(
      CommandVersionSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('recipeVersion', repository, CommandVersionSchema, logger);
    this.logger.info('RecipeVersionRepository initialized');
  }

  protected override loggableEntity(
    entity: CommandVersion,
  ): Partial<CommandVersion> {
    return {
      id: entity.id,
      recipeId: entity.recipeId,
      version: entity.version,
      name: entity.name,
    };
  }

  async findByCommandId(recipeId: CommandId): Promise<CommandVersion[]> {
    this.logger.info('Finding recipe versions by recipe ID', { recipeId });

    try {
      const versions = await this.repository.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { recipeId: recipeId as any }, // TypeORM compatibility with branded types
        order: { version: 'DESC' },
        relations: ['gitCommit'],
      });
      this.logger.info('Recipe versions found by recipe ID', {
        recipeId,
        count: versions.length,
      });
      return versions;
    } catch (error) {
      this.logger.error('Failed to find recipe versions by recipe ID', {
        recipeId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findLatestByCommandIds(
    recipeIds: CommandId[],
  ): Promise<CommandVersion[]> {
    const uniqueCommandIds = [...new Set(recipeIds)];

    if (uniqueCommandIds.length === 0) {
      this.logger.info('No recipe IDs provided to findLatestByCommandIds');
      return [];
    }

    this.logger.info('Finding latest recipe versions by recipe IDs', {
      count: uniqueCommandIds.length,
    });

    try {
      const versions = await this.repository
        .createQueryBuilder('recipeVersion')
        .where('recipeVersion.recipeId IN (:...recipeIds)', {
          recipeIds: uniqueCommandIds as string[],
        })
        .distinctOn(['recipeVersion.recipeId'])
        .orderBy('recipeVersion.recipeId', 'ASC')
        .addOrderBy('recipeVersion.version', 'DESC')
        .getMany();

      this.logger.info('Latest recipe versions found by recipe IDs', {
        requestedCount: uniqueCommandIds.length,
        foundCount: versions.length,
      });

      return versions;
    } catch (error) {
      this.logger.error('Failed to find latest recipe versions by recipe IDs', {
        count: uniqueCommandIds.length,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findByCommandIdAndVersion(
    recipeId: CommandId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ): Promise<CommandVersion | null> {
    this.logger.info('Finding recipe version by recipe ID and version', {
      recipeId,
      version,
      spaceIdCount: allowedSpaceIds.length,
    });

    if (allowedSpaceIds.length === 0) {
      this.logger.warn('No allowed space IDs provided, returning null', {
        recipeId,
        version,
      });
      return null;
    }

    try {
      const recipeVersion = await this.repository
        .createQueryBuilder('rv')
        .innerJoin('rv.recipe', 'recipe')
        .where('rv.command_id = :recipeId', { recipeId })
        .andWhere('rv.version = :version', { version })
        .andWhere('recipe.space_id IN (:...allowedSpaceIds)', {
          allowedSpaceIds,
        })
        .getOne();

      if (recipeVersion) {
        this.logger.info('Recipe version found by recipe ID and version', {
          recipeId,
          version,
          versionId: recipeVersion.id,
        });
      } else {
        this.logger.warn('Recipe version not found by recipe ID and version', {
          recipeId,
          version,
        });
      }

      return recipeVersion;
    } catch (error) {
      this.logger.error(
        'Failed to find recipe version by recipe ID and version',
        {
          recipeId,
          version,
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }
}
