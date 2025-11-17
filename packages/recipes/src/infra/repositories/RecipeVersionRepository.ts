import { IRecipeVersionRepository } from '../../domain/repositories/IRecipeVersionRepository';
import { RecipeVersionSchema } from '../schemas/RecipeVersionSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import {
  localDataSource,
  AbstractRepository,
  getErrorMessage,
} from '@packmind/node-utils';
import {
  RecipeId,
  RecipeVersion,
  RecipeVersionId,
  SpaceId,
} from '@packmind/types';

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

  async updateEmbedding(
    recipeVersionId: RecipeVersionId,
    embedding: number[],
  ): Promise<void> {
    this.logger.info('Updating embedding for recipe version', {
      recipeVersionId,
      embeddingDimensions: embedding.length,
    });

    try {
      const result = await this.repository.update(
        { id: recipeVersionId },
        { embedding },
      );

      if (result.affected === 0) {
        const errorMessage = `No recipe version found with id ${recipeVersionId}`;
        this.logger.error('Failed to update embedding - version not found', {
          recipeVersionId,
        });
        throw new Error(errorMessage);
      }

      this.logger.info('Embedding updated successfully', {
        recipeVersionId,
      });
    } catch (error) {
      this.logger.error('Failed to update embedding', {
        recipeVersionId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findSimilarByEmbedding(
    embedding: number[],
    spaceId?: SpaceId,
    threshold = 0.7,
  ): Promise<Array<RecipeVersion & { similarity: number }>> {
    this.logger.info('Finding similar recipe versions by embedding', {
      embeddingDimensions: embedding.length,
      spaceId,
      threshold,
    });

    try {
      const embeddingString = `[${embedding.join(',')}]`;

      let query = this.repository
        .createQueryBuilder('recipe_version')
        .select('recipe_version.*')
        .addSelect(
          `(recipe_version.embedding <#> '${embeddingString}'::vector) * -1`,
          'similarity',
        )
        .where('recipe_version.embedding IS NOT NULL')
        .andWhere(
          `(recipe_version.embedding <#> '${embeddingString}'::vector) * -1 >= :threshold`,
          { threshold },
        );

      if (spaceId) {
        query = query
          .innerJoin(
            'recipes',
            'recipe',
            'recipe_version.recipe_id = recipe.id',
          )
          .andWhere('recipe.space_id = :spaceId', { spaceId });
      }

      const results = await query.orderBy('similarity', 'DESC').getRawMany();

      this.logger.info('Similar recipe versions found', {
        count: results.length,
        spaceId,
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to find similar recipe versions', {
        spaceId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findLatestVersionsWhereEmbeddingIsNull(
    spaceId?: SpaceId,
  ): Promise<RecipeVersion[]> {
    this.logger.info('Finding latest recipe versions without embeddings', {
      spaceId,
    });

    try {
      // Get all versions without embeddings
      let allVersionsQuery = this.repository
        .createQueryBuilder('recipe_version')
        .where('recipe_version.embedding IS NULL');

      if (spaceId) {
        allVersionsQuery = allVersionsQuery
          .innerJoin(
            'recipes',
            'recipe',
            'recipe_version.recipe_id = recipe.id',
          )
          .andWhere('recipe.space_id = :spaceId', { spaceId });
      }

      const versionsWithoutEmbeddings = await allVersionsQuery.getMany();

      // Group by recipe_id and find the latest version for each
      const latestVersionsMap = new Map<string, RecipeVersion>();

      for (const version of versionsWithoutEmbeddings) {
        const recipeId = version.recipeId;
        const existing = latestVersionsMap.get(recipeId);

        if (!existing || version.version > existing.version) {
          latestVersionsMap.set(recipeId, version);
        }
      }

      const results = Array.from(latestVersionsMap.values());

      this.logger.info('Latest recipe versions without embeddings found', {
        count: results.length,
        spaceId,
      });

      return results;
    } catch (error) {
      this.logger.error(
        'Failed to find latest recipe versions without embeddings',
        {
          spaceId,
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  async findAllLatestVersions(spaceId?: SpaceId): Promise<RecipeVersion[]> {
    this.logger.info('Finding all latest recipe versions', { spaceId });

    try {
      // Get all versions, optionally filtered by space
      let allVersionsQuery =
        this.repository.createQueryBuilder('recipe_version');

      if (spaceId) {
        allVersionsQuery = allVersionsQuery
          .innerJoin(
            'recipes',
            'recipe',
            'recipe_version.recipe_id = recipe.id',
          )
          .andWhere('recipe.space_id = :spaceId', { spaceId });
      }

      const allVersions = await allVersionsQuery.getMany();

      // Group by recipe_id and find the latest version for each
      const latestVersionsMap = new Map<string, RecipeVersion>();

      for (const version of allVersions) {
        const recipeId = version.recipeId;
        const existing = latestVersionsMap.get(recipeId);

        if (!existing || version.version > existing.version) {
          latestVersionsMap.set(recipeId, version);
        }
      }

      const results = Array.from(latestVersionsMap.values());

      this.logger.info('All latest recipe versions found', {
        count: results.length,
        spaceId,
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to find all latest recipe versions', {
        spaceId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }
}
