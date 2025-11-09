import { RecipesDeployment } from '@packmind/types';
import { RecipeId, RecipeVersion } from '@packmind/recipes/types';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import { RecipesDeploymentSchema } from '../schemas/RecipesDeploymentSchema';
import { Repository } from 'typeorm';
import { OrganizationId } from '@packmind/types';
import { GitRepoId } from '@packmind/git';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import { TargetId, DistributionStatus } from '@packmind/types';

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
        relations: ['recipeVersions', 'gitCommit', 'target'],
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
        .leftJoinAndSelect('deployment.gitCommit', 'gitCommit')
        .leftJoinAndSelect('deployment.target', 'target')
        .leftJoinAndSelect('target.gitRepo', 'gitRepo')
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
        .leftJoinAndSelect('deployment.gitCommit', 'gitCommit')
        .leftJoinAndSelect('deployment.target', 'target')
        .where('deployment.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('target.gitRepoId IN (:...gitRepoIds)', {
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

  async findActiveRecipeVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<RecipeVersion[]> {
    this.logger.info('Finding active recipe versions by target', {
      organizationId,
      targetId,
    });

    try {
      // Find all successful deployments to this target for this organization
      const deployments = await this.repository
        .createQueryBuilder('deployment')
        .leftJoinAndSelect('deployment.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('deployment.target', 'target')
        .leftJoinAndSelect('deployment.gitCommit', 'gitCommit')
        .where('deployment.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('deployment.target_id = :targetId', {
          targetId,
        })
        .andWhere('deployment.status = :status', {
          status: DistributionStatus.success,
        })
        .orderBy('deployment.createdAt', 'DESC')
        .getMany();

      this.logger.info('Found successful deployments for target', {
        organizationId,
        targetId,
        successfulDeploymentsCount: deployments.length,
      });

      // Extract all recipe versions and keep only the latest version for each recipe
      const recipeVersionsMap = new Map<string, RecipeVersion>();

      for (const deployment of deployments) {
        for (const recipeVersion of deployment.recipeVersions) {
          const recipeId = recipeVersion.recipeId;
          // Keep the latest version for each recipe (deployments are ordered by creation date DESC)
          if (!recipeVersionsMap.has(recipeId)) {
            recipeVersionsMap.set(recipeId, recipeVersion as RecipeVersion);
          }
        }
      }

      const activeRecipeVersions = Array.from(recipeVersionsMap.values());

      this.logger.info('Active recipe versions found by target', {
        organizationId,
        targetId,
        activeRecipeVersionsCount: activeRecipeVersions.length,
        recipeIds: activeRecipeVersions.map((rv) => rv.recipeId),
      });

      return activeRecipeVersions;
    } catch (error) {
      this.logger.error('Failed to find active recipe versions by target', {
        organizationId,
        targetId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listByTargetIds(
    organizationId: OrganizationId,
    targetIds: TargetId[],
  ): Promise<RecipesDeployment[]> {
    this.logger.info(
      'Listing recipes deployments by organization ID and target IDs',
      {
        organizationId,
        targetIds,
        targetCount: targetIds.length,
      },
    );

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('deployment')
        .innerJoinAndSelect('deployment.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('deployment.gitCommit', 'gitCommit')
        .leftJoinAndSelect('deployment.target', 'target')
        .where('deployment.organizationId = :organizationId', {
          organizationId,
        });

      // Use the new direct target relation
      queryBuilder.andWhere('deployment.target_id IN (:...targetIds)', {
        targetIds: targetIds as string[],
      });

      queryBuilder.orderBy('deployment.createdAt', 'ASC');

      const deployments = await queryBuilder.getMany();

      this.logger.info(
        'Recipes deployments listed by organization ID and target IDs successfully',
        {
          organizationId,
          targetIds,
          count: deployments.length,
        },
      );
      return deployments;
    } catch (error) {
      this.logger.error(
        'Failed to list recipes deployments by organization ID and target IDs',
        {
          organizationId,
          targetIds,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async listByOrganizationIdWithStatus(
    organizationId: OrganizationId,
    status?: DistributionStatus,
  ): Promise<RecipesDeployment[]> {
    this.logger.info(
      'Listing recipes deployments by organization ID with status filter',
      {
        organizationId,
        status,
      },
    );

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('deployment')
        .innerJoinAndSelect('deployment.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('deployment.gitCommit', 'gitCommit')
        .leftJoinAndSelect('deployment.target', 'target')
        .where('deployment.organizationId = :organizationId', {
          organizationId,
        });

      if (status) {
        queryBuilder.andWhere('deployment.status = :status', { status });
      }

      queryBuilder.orderBy('deployment.createdAt', 'DESC');

      const deployments = await queryBuilder.getMany();

      this.logger.info(
        'Recipes deployments listed by organization ID with status filter successfully',
        {
          organizationId,
          status,
          count: deployments.length,
        },
      );
      return deployments;
    } catch (error) {
      this.logger.error(
        'Failed to list recipes deployments by organization ID with status filter',
        {
          organizationId,
          status,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
