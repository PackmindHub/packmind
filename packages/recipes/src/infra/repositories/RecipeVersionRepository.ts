import { RecipeVersion } from '../../domain/entities/RecipeVersion';
import { RecipeId } from '../../domain/entities/Recipe';
import { IRecipeVersionRepository } from '../../domain/repositories/IRecipeVersionRepository';
import { RecipeVersionSchema } from '../schemas/RecipeVersionSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';

const origin = 'RecipeVersionRepository';

export class RecipeVersionRepository
  extends AbstractRepository<RecipeVersion>
  implements IRecipeVersionRepository
{
  constructor(
    repository: Repository<RecipeVersion> = localDataSource.getRepository<RecipeVersion>(
      RecipeVersionSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('recipeVersion', repository, logger, RecipeVersionSchema);
    this.logger.info('RecipeVersionRepository initialized');
  }

  protected override loggableEntity(
    entity: RecipeVersion,
  ): Partial<RecipeVersion> {
    return {
      id: entity.id,
      recipeId: entity.recipeId,
      version: entity.version,
      name: entity.name,
    };
  }

  async list(): Promise<RecipeVersion[]> {
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

  async findByRecipeId(recipeId: RecipeId): Promise<RecipeVersion[]> {
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

  async findLatestByRecipeId(
    recipeId: RecipeId,
  ): Promise<RecipeVersion | null> {
    this.logger.info('Finding latest recipe version by recipe ID', {
      recipeId,
    });

    try {
      const versions = await this.findByRecipeId(recipeId);
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

  async findByRecipeIdAndVersion(
    recipeId: RecipeId,
    version: number,
  ): Promise<RecipeVersion | null> {
    this.logger.info('Finding recipe version by recipe ID and version', {
      recipeId,
      version,
    });

    try {
      const recipeVersion = await this.repository.findOne({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { recipeId: recipeId as any, version }, // TypeORM compatibility with branded types
      });

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
