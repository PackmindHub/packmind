import { ICommandVersionRepository } from '../../domain/repositories/ICommandVersionRepository';
import { CommandVersionSchema } from '../schemas/CommandVersionSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
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

  async list(): Promise<CommandVersion[]> {
    this.logger.info('Listing all recipe versions');

    try {
      const versions = await this.repository.find({
        order: { version: 'DESC' },
        relations: ['gitCommit'],
      });
      this.logger.info('Recipe versions found', { count: versions.length });
      return versions;
    } catch (error) {
      this.logger.error('Failed to list recipe versions', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findLatestByCommandId(
    recipeId: CommandId,
  ): Promise<CommandVersion | null> {
    this.logger.info('Finding latest recipe version by recipe ID', {
      recipeId,
    });

    try {
      const versions = await this.findByCommandId(recipeId);
      const latestVersion = versions.length > 0 ? versions[0] : null;

      if (latestVersion) {
        this.logger.info('Latest recipe version found', {
          recipeId,
          versionId: latestVersion.id,
          version: latestVersion.version,
        });
      } else {
        this.logger.warn('No recipe versions found for recipe', { recipeId });
      }

      return latestVersion;
    } catch (error) {
      this.logger.error('Failed to find latest recipe version by recipe ID', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
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
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
