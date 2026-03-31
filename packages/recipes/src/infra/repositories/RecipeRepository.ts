import { IRecipeRepository } from '../../domain/repositories/IRecipeRepository';
import { RecipeSchema } from '../schemas/RecipeSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import {
  OrganizationId,
  QueryOption,
  Recipe,
  RecipeId,
  SpaceId,
  UserId,
} from '@packmind/types';

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
    super('recipe', repository, RecipeSchema, logger);
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

  async findBySpaceId(
    spaceId: SpaceId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Recipe[]> {
    this.logger.info('Finding recipes with scope by space ID', {
      spaceId,
      includeDeleted: opts?.includeDeleted ?? false,
    });

    try {
      // First, get all recipes for the space with user information
      const recipes = await this.repository.find({
        where: { spaceId },
        relations: ['gitCommit'],
        withDeleted: opts?.includeDeleted ?? false,
      });

      // For each recipe, enrich with user data
      const recipesWithScope = await Promise.all(
        recipes.map(async (recipe) => {
          const createdBy = await this.getCreatedBy(recipe.userId);

          return {
            ...recipe,
            createdBy,
          };
        }),
      );

      this.logger.info('Recipes with scope found by space ID', {
        spaceId,
        count: recipesWithScope.length,
      });
      return recipesWithScope;
    } catch (error) {
      this.logger.error('Failed to find recipes with scope by space ID', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async markAsMoved(
    recipeId: RecipeId,
    destinationSpaceId: SpaceId,
  ): Promise<void> {
    this.logger.info('Marking recipe as moved', {
      recipeId,
      destinationSpaceId,
    });

    try {
      await this.repository.manager.transaction(async (manager) => {
        const transactionalRepository = manager.getRepository(RecipeSchema);
        await transactionalRepository.update(
          { id: recipeId },
          { movedTo: destinationSpaceId },
        );
        await transactionalRepository.softDelete({ id: recipeId });
      });

      this.logger.info('Recipe marked as moved successfully', {
        recipeId,
        destinationSpaceId,
      });
    } catch (error) {
      this.logger.error('Failed to mark recipe as moved', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
