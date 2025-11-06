import { Recipe } from '../../domain/entities/Recipe';
import { IRecipeRepository } from '../../domain/repositories/IRecipeRepository';
import { RecipeSchema } from '../schemas/RecipeSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import {
  localDataSource,
  AbstractRepository,
  QueryOption,
} from '@packmind/shared';
import { OrganizationId, UserId } from '@packmind/accounts';
import { SpaceId } from '@packmind/shared/types';

const origin = 'RecipeRepository';

export class RecipeRepository
  extends AbstractRepository<Recipe>
  implements IRecipeRepository
{
  constructor(
    repository: Repository<Recipe> = localDataSource.getRepository<Recipe>(
      RecipeSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('recipe', repository, logger, RecipeSchema);
    this.logger.info('RecipeRepository initialized');
  }

  protected override loggableEntity(entity: Recipe): Partial<Recipe> {
    return {
      id: entity.id,
      name: entity.name,
    };
  }

  async findBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: QueryOption,
  ): Promise<Recipe | null> {
    this.logger.info('Finding recipe by slug and organization', {
      slug,
      organizationId,
    });

    try {
      // Query recipes by slug across all spaces in the organization
      // Join with spaces table to filter by organizationId
      let queryBuilder = this.repository
        .createQueryBuilder('recipe')
        .innerJoin('spaces', 'space', 'recipe.space_id = space.id')
        .where('recipe.slug = :slug', { slug })
        .andWhere('space.organization_id = :organizationId', {
          organizationId,
        });

      // Include deleted recipes if requested
      if (opts?.includeDeleted) {
        queryBuilder = queryBuilder.withDeleted();
      }

      const recipe = await queryBuilder.getOne();

      if (recipe) {
        this.logger.info('Recipe found by slug and organization', {
          slug,
          organizationId,
          recipeId: recipe.id,
        });
      } else {
        this.logger.warn('Recipe not found by slug and organization', {
          slug,
          organizationId,
        });
      }
      return recipe;
    } catch (error) {
      this.logger.error('Failed to find recipe by slug and organization', {
        slug,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<Recipe[]> {
    this.logger.warn(
      'findByOrganizationId is deprecated - recipes are now space-scoped',
      {
        organizationId,
      },
    );
    // Recipes no longer have organizationId - they are space-scoped
    // This method is deprecated and will return an empty array
    return [];

    // Old implementation (no longer works after organizationId column was dropped):
    /*
    try {
      const recipes = await this.repository.find({ where: { organizationId } });
      this.logger.info('Recipes found by organization ID', {
        organizationId,
        count: recipes.length,
      });
      return recipes;
    } catch (error) {
      this.logger.error('Failed to find recipes by organization ID', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    */
  }

  async findByUserId(userId: UserId): Promise<Recipe[]> {
    this.logger.info('Finding recipes by user ID', { userId });

    try {
      const recipes = await this.repository.find({ where: { userId } });
      this.logger.info('Recipes found by user ID', {
        userId,
        count: recipes.length,
      });
      return recipes;
    } catch (error) {
      this.logger.error('Failed to find recipes by user ID', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByOrganizationAndUser(
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Recipe[]> {
    this.logger.warn(
      'findByOrganizationAndUser is deprecated - recipes are now space-scoped',
      {
        organizationId,
        userId,
      },
    );
    // Recipes no longer have organizationId - they are space-scoped
    // This method is deprecated and will return an empty array
    return [];

    // Old implementation (no longer works after organizationId column was dropped):
    /*
    try {
      const recipes = await this.repository.find({
        where: { organizationId, userId },
      });
      this.logger.info('Recipes found by organization and user ID', {
        organizationId,
        userId,
        count: recipes.length,
      });
      return recipes;
    } catch (error) {
      this.logger.error('Failed to find recipes by organization and user ID', {
        organizationId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    */
  }

  async findBySpaceId(spaceId: SpaceId): Promise<Recipe[]> {
    this.logger.info('Finding recipes by space ID', {
      spaceId,
    });

    try {
      const recipes = await this.repository.find({
        where: { spaceId },
        relations: ['gitCommit'],
      });

      this.logger.info('Recipes found by space ID', {
        spaceId,
        count: recipes.length,
      });
      return recipes;
    } catch (error) {
      this.logger.error('Failed to find recipes by space ID', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
