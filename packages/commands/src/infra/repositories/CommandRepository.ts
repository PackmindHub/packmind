import { ICommandRepository } from '../../domain/repositories/ICommandRepository';
import { CommandSchema } from '../schemas/CommandSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import {
  OrganizationId,
  QueryOption,
  Command,
  CommandId,
  SpaceId,
  UserId,
} from '@packmind/types';

const origin = 'RecipeRepository';

export class CommandRepository
  extends AbstractRepository<Command>
  implements ICommandRepository
{
  constructor(
    repository: Repository<Command> = localDataSource.getRepository<Command>(
      CommandSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('recipe', repository, CommandSchema, logger);
    this.logger.info('RecipeRepository initialized');
  }

  protected override loggableEntity(entity: Command): Partial<Command> {
    return {
      id: entity.id,
      name: entity.name,
    };
  }

  async findBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: QueryOption,
  ): Promise<Command | null> {
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

  async findByUserId(userId: UserId): Promise<Command[]> {
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
  ): Promise<Command[]> {
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
      const commandsWithScope = await Promise.all(
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
        count: commandsWithScope.length,
      });
      return commandsWithScope;
    } catch (error) {
      this.logger.error('Failed to find recipes with scope by space ID', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async markAsMoved(
    recipeId: CommandId,
    destinationSpaceId: SpaceId,
  ): Promise<void> {
    this.logger.info('Marking recipe as moved', {
      recipeId,
      destinationSpaceId,
    });

    try {
      await this.repository.manager.transaction(async (manager) => {
        const transactionalRepository = manager.getRepository(CommandSchema);
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
