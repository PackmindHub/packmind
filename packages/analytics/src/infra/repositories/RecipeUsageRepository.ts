import { PackmindLogger } from '@packmind/logger';
import { AbstractRepository, localDataSource } from '@packmind/node-utils';
import { GitRepoId, OrganizationId, RecipeId, TargetId } from '@packmind/types';
import { Repository } from 'typeorm';
import { RecipeUsage } from '../../domain/entities/RecipeUsage';
import { IRecipeUsageRepository } from '../../domain/repositories/IRecipeUsageRepository';
import { RecipeUsageSchema } from '../schemas/RecipeUsageSchema';

const origin = 'RecipeUsageRepository';

export class RecipeUsageRepository
  extends AbstractRepository<RecipeUsage>
  implements IRecipeUsageRepository
{
  constructor(
    repository: Repository<RecipeUsage> = localDataSource.getRepository<RecipeUsage>(
      RecipeUsageSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('recipeUsage', repository, logger, RecipeUsageSchema);
    this.logger.info('RecipeUsageRepository initialized');
  }

  protected override loggableEntity(entity: RecipeUsage): Partial<RecipeUsage> {
    return {
      id: entity.id,
      recipeId: entity.recipeId,
      aiAgent: entity.aiAgent,
      userId: entity.userId,
    };
  }

  async list(): Promise<RecipeUsage[]> {
    this.logger.info('Listing all recipe usage from database');

    try {
      const usages = await this.repository.find({
        relations: ['gitRepo'],
      });
      this.logger.info('Recipe usage listed successfully', {
        count: usages.length,
      });
      return usages;
    } catch (error) {
      this.logger.error('Failed to list recipe usage from database', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByRecipeId(recipeId: RecipeId): Promise<RecipeUsage[]> {
    this.logger.info('Finding recipe usage by recipe ID', { recipeId });

    try {
      const usages = await this.repository.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { recipeId: recipeId as any }, // TypeORM compatibility with branded types
      });
      this.logger.info('Recipe usage found by recipe ID', {
        recipeId,
        count: usages.length,
      });
      return usages;
    } catch (error) {
      this.logger.error('Failed to find recipe usage by recipe ID', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listByOrganization(
    organizationId: OrganizationId,
  ): Promise<RecipeUsage[]> {
    this.logger.info('Listing recipe usage by organization', {
      organizationId,
    });

    try {
      const usages = await this.repository
        .createQueryBuilder('recipe_usage')
        .innerJoinAndSelect('recipe_usage.recipe', 'recipe')
        .innerJoin('spaces', 'space', 'space.id = recipe.space_id')
        .where('space.organization_id = :organizationId', { organizationId })
        .leftJoinAndSelect('recipe_usage.gitRepo', 'gitRepo')
        .getMany();

      this.logger.info('Recipe usage listed by organization successfully', {
        organizationId,
        count: usages.length,
      });
      return usages;
    } catch (error) {
      this.logger.error('Failed to list recipe usage by organization', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listByRepository(repositoryId: GitRepoId): Promise<RecipeUsage[]> {
    this.logger.info('Listing recipe usage by repository', {
      repositoryId,
    });

    try {
      const usages = await this.repository
        .createQueryBuilder('recipe_usage')
        .where('recipe_usage.git_repo_id = :repositoryId', { repositoryId })
        .leftJoinAndSelect('recipe_usage.gitRepo', 'gitRepo')
        .leftJoinAndSelect('recipe_usage.recipe', 'recipe')
        .getMany();

      this.logger.info('Recipe usage listed by repository successfully', {
        repositoryId,
        count: usages.length,
      });
      return usages;
    } catch (error) {
      this.logger.error('Failed to list recipe usage by repository', {
        repositoryId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listByTarget(targetId: TargetId): Promise<RecipeUsage[]> {
    this.logger.info('Listing recipe usage by target', {
      targetId,
    });

    try {
      const usages = await this.repository
        .createQueryBuilder('recipe_usage')
        .where('recipe_usage.target_id = :targetId', { targetId })
        .leftJoinAndSelect('recipe_usage.target', 'target')
        .leftJoinAndSelect('recipe_usage.gitRepo', 'gitRepo')
        .leftJoinAndSelect('recipe_usage.recipe', 'recipe')
        .getMany();

      this.logger.info('Recipe usage listed by target successfully', {
        targetId,
        count: usages.length,
      });
      return usages;
    } catch (error) {
      this.logger.error('Failed to list recipe usage by target', {
        targetId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
