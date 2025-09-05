import { RecipesDeployment } from '../../domain/entities/RecipesDeployment';
import { RecipeId } from '@packmind/recipes/types';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import { RecipesDeploymentSchema } from '../schemas/RecipesDeploymentSchema';
import { Repository } from 'typeorm';
import { OrganizationId } from '@packmind/accounts';
import { GitRepoId } from '@packmind/git';
import {
  PackmindLogger,
  localDataSource,
  AbstractRepository,
} from '@packmind/shared';

const origin = 'RecipesDeploymentRepository';

export class RecipesDeploymentRepository
  extends AbstractRepository<RecipesDeployment>
  implements IRecipesDeploymentRepository
{
  constructor(
    repository: Repository<RecipesDeployment> = localDataSource.getRepository<RecipesDeployment>(
      RecipesDeploymentSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('recipesDeployment', repository, logger, RecipesDeploymentSchema);
    this.logger.info('RecipesDeploymentRepository initialized');
  }

  protected override loggableEntity(
    entity: RecipesDeployment,
  ): Partial<RecipesDeployment> {
    return {
      id: entity.id,
      authorId: entity.authorId,
      organizationId: entity.organizationId,
    };
  }

  async listByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<RecipesDeployment[]> {
    this.logger.info('Listing recipes deployments by organization ID', {
      organizationId,
    });

    try {
      const deployments = await this.repository.find({
        where: { organizationId },
        relations: ['recipeVersions', 'gitRepos'],
      });
      this.logger.info(
        'Recipes deployments listed by organization ID successfully',
        {
          organizationId,
          count: deployments.length,
        },
      );
      return deployments;
    } catch (error) {
      this.logger.error(
        'Failed to list recipes deployments by organization ID',
        {
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async listByRecipeId(
    recipeId: RecipeId,
    organizationId: OrganizationId,
  ): Promise<RecipesDeployment[]> {
    this.logger.info(
      'Listing recipes deployments by recipe ID and organization ID',
      {
        recipeId,
        organizationId,
      },
    );

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('deployment')
        .innerJoinAndSelect('deployment.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('deployment.gitRepos', 'gitRepo')
        .leftJoinAndSelect('deployment.gitCommits', 'gitCommits')
        .where('recipeVersion.recipeId = :recipeId', {
          recipeId: recipeId as string,
        })
        .andWhere('deployment.organizationId = :organizationId', {
          organizationId,
        })
        .orderBy('deployment.createdAt', 'DESC');

      const deployments = await queryBuilder.getMany();

      this.logger.info(
        'Recipes deployments listed by recipe ID and organization ID successfully',
        {
          recipeId,
          organizationId,
          count: deployments.length,
        },
      );
      return deployments;
    } catch (error) {
      this.logger.error('Failed to list recipes deployments by recipe ID', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listByOrganizationIdAndGitRepos(
    organizationId: OrganizationId,
    gitRepoIds: GitRepoId[],
  ): Promise<RecipesDeployment[]> {
    this.logger.info(
      'Listing recipes deployments by organization ID and git repository IDs',
      {
        organizationId,
        gitRepoIds,
        gitRepoCount: gitRepoIds.length,
      },
    );

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('deployment')
        .innerJoinAndSelect('deployment.recipeVersions', 'recipeVersion')
        .innerJoinAndSelect('deployment.gitRepos', 'gitRepo')
        .leftJoinAndSelect('deployment.gitCommits', 'gitCommits')
        .where('deployment.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('gitRepo.id IN (:...gitRepoIds)', {
          gitRepoIds: gitRepoIds as string[],
        })
        .orderBy('deployment.createdAt', 'ASC'); // Order by creation time for proper version comparison

      const deployments = await queryBuilder.getMany();

      this.logger.info(
        'Recipes deployments listed by organization ID and git repository IDs successfully',
        {
          organizationId,
          gitRepoIds,
          count: deployments.length,
        },
      );
      return deployments;
    } catch (error) {
      this.logger.error(
        'Failed to list recipes deployments by organization ID and git repository IDs',
        {
          organizationId,
          gitRepoIds,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
