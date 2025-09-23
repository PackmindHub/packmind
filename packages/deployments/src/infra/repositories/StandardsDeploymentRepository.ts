import { StandardsDeployment } from '../../domain/entities/StandardsDeployment';
import { StandardVersion } from '@packmind/standards/types';
import { StandardId } from '@packmind/standards/types';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import { StandardsDeploymentSchema } from '../schemas/StandardsDeploymentSchema';
import { Repository } from 'typeorm';
import {
  PackmindLogger,
  localDataSource,
  AbstractRepository,
  TargetId,
  DistributionStatus,
} from '@packmind/shared';
import { OrganizationId } from '@packmind/accounts';
import { GitRepoId } from '@packmind/git';

const origin = 'StandardsDeploymentRepository';

export class StandardsDeploymentRepository
  extends AbstractRepository<StandardsDeployment>
  implements IStandardsDeploymentRepository
{
  constructor(
    repository: Repository<StandardsDeployment> = localDataSource.getRepository<StandardsDeployment>(
      StandardsDeploymentSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('standardsDeployment', repository, logger, StandardsDeploymentSchema);
    this.logger.info('StandardsDeploymentRepository initialized');
  }

  protected override loggableEntity(
    entity: StandardsDeployment,
  ): Partial<StandardsDeployment> {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      authorId: entity.authorId,
    };
  }

  async listByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<StandardsDeployment[]> {
    this.logger.info('Listing standards deployments by organization ID', {
      organizationId,
    });

    try {
      const deployments = await this.repository.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { organizationId: organizationId as any }, // TypeORM compatibility with branded types
        order: { createdAt: 'DESC' },
        relations: ['standardVersions', 'gitCommit', 'target'],
      });
      this.logger.info('Standards deployments found by organization ID', {
        organizationId,
        count: deployments.length,
      });
      return deployments;
    } catch (error) {
      this.logger.error(
        'Failed to list standards deployments by organization ID',
        {
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async listByStandardId(
    standardId: StandardId,
    organizationId: OrganizationId,
  ): Promise<StandardsDeployment[]> {
    this.logger.info('Listing standards deployments by standard ID', {
      standardId,
      organizationId,
    });

    try {
      // This query is more complex as we need to join through standardVersions
      // to find deployments that contain versions of the specified standard
      const deployments = await this.repository
        .createQueryBuilder('deployment')
        .leftJoinAndSelect('deployment.standardVersions', 'standardVersion')
        .leftJoinAndSelect('deployment.gitCommit', 'gitCommit')
        .leftJoinAndSelect('deployment.target', 'target')
        .leftJoinAndSelect('target.gitRepo', 'gitRepo')
        .where('deployment.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('standardVersion.standardId = :standardId', { standardId })
        .orderBy('deployment.createdAt', 'DESC')
        .getMany();

      this.logger.info('Standards deployments found by standard ID', {
        standardId,
        organizationId,
        count: deployments.length,
      });
      return deployments;
    } catch (error) {
      this.logger.error('Failed to list standards deployments by standard ID', {
        standardId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listByOrganizationIdAndGitRepos(
    organizationId: OrganizationId,
    gitRepoIds: GitRepoId[],
  ): Promise<StandardsDeployment[]> {
    this.logger.info(
      'Listing standards deployments by organization and git repos',
      {
        organizationId,
        gitRepoCount: gitRepoIds.length,
      },
    );

    try {
      if (gitRepoIds.length === 0) {
        this.logger.info('No git repo IDs provided, returning empty array');
        return [];
      }

      // Query deployments that target any of the specified git repositories
      const deployments = await this.repository
        .createQueryBuilder('deployment')
        .leftJoinAndSelect('deployment.standardVersions', 'standardVersions')
        .leftJoinAndSelect('deployment.gitCommit', 'gitCommit')
        .leftJoinAndSelect('deployment.target', 'target')
        .where('deployment.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('target.gitRepoId IN (:...gitRepoIds)', { gitRepoIds })
        .orderBy('deployment.createdAt', 'DESC')
        .getMany();

      this.logger.info(
        'Standards deployments found by organization and git repos',
        {
          organizationId,
          gitRepoCount: gitRepoIds.length,
          count: deployments.length,
        },
      );
      return deployments;
    } catch (error) {
      this.logger.error(
        'Failed to list standards deployments by organization and git repos',
        {
          organizationId,
          gitRepoCount: gitRepoIds.length,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findActiveStandardVersionsByRepository(
    organizationId: OrganizationId,
    gitRepoId: GitRepoId,
  ): Promise<StandardVersion[]> {
    this.logger.info('Finding active standard versions by repository', {
      organizationId,
      gitRepoId,
    });

    try {
      // Find all successful deployments to this repository for this organization
      const deployments = await this.repository
        .createQueryBuilder('deployment')
        .leftJoinAndSelect('deployment.standardVersions', 'standardVersion')
        .leftJoinAndSelect('deployment.gitCommit', 'gitCommit')
        .leftJoinAndSelect('deployment.target', 'target')
        .where('deployment.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('target.gitRepoId = :gitRepoId', { gitRepoId })
        .andWhere('deployment.status = :status', {
          status: DistributionStatus.success,
        })
        .orderBy('deployment.createdAt', 'DESC')
        .getMany();

      // Extract all standard versions and deduplicate by standardId,
      // keeping the most recently deployed version of each standard
      const standardVersionMap = new Map<string, StandardVersion>();

      // Process deployments in chronological order (most recent first)
      for (const deployment of deployments) {
        for (const standardVersion of deployment.standardVersions) {
          // Only keep the first (most recent) version of each standard
          if (!standardVersionMap.has(standardVersion.standardId)) {
            standardVersionMap.set(standardVersion.standardId, standardVersion);
          }
        }
      }

      const activeStandardVersions = Array.from(standardVersionMap.values());

      this.logger.info('Active standard versions found by repository', {
        organizationId,
        gitRepoId,
        totalSuccessfulDeployments: deployments.length,
        activeStandardVersionsCount: activeStandardVersions.length,
        standardIds: activeStandardVersions.map((sv) => sv.standardId),
      });

      return activeStandardVersions;
    } catch (error) {
      this.logger.error(
        'Failed to find active standard versions by repository',
        {
          organizationId,
          gitRepoId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findActiveStandardVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<StandardVersion[]> {
    this.logger.info('Finding active standard versions by target', {
      organizationId,
      targetId,
    });

    try {
      // Find all successful deployments to this target for this organization
      const deployments = await this.repository
        .createQueryBuilder('deployment')
        .leftJoinAndSelect('deployment.standardVersions', 'standardVersion')
        .leftJoinAndSelect('deployment.gitCommit', 'gitCommit')
        .leftJoinAndSelect('deployment.target', 'target')
        .where('deployment.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('deployment.target_id = :targetId', { targetId })
        .andWhere('deployment.status = :status', {
          status: DistributionStatus.success,
        })
        .orderBy('deployment.createdAt', 'DESC')
        .getMany();

      // Extract all standard versions and deduplicate by standardId,
      // keeping the most recently deployed version of each standard
      const standardVersionMap = new Map<string, StandardVersion>();

      // Process deployments in chronological order (most recent first)
      for (const deployment of deployments) {
        for (const standardVersion of deployment.standardVersions) {
          // Only keep the first (most recent) version of each standard
          if (!standardVersionMap.has(standardVersion.standardId)) {
            standardVersionMap.set(standardVersion.standardId, standardVersion);
          }
        }
      }

      const activeStandardVersions = Array.from(standardVersionMap.values());

      this.logger.info('Active standard versions found by target', {
        organizationId,
        targetId,
        totalSuccessfulDeployments: deployments.length,
        activeStandardVersionsCount: activeStandardVersions.length,
        standardIds: activeStandardVersions.map((sv) => sv.standardId),
      });

      return activeStandardVersions;
    } catch (error) {
      this.logger.error('Failed to find active standard versions by target', {
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
  ): Promise<StandardsDeployment[]> {
    this.logger.info(
      'Listing standards deployments by organization ID and target IDs',
      {
        organizationId,
        targetIds,
        targetCount: targetIds.length,
      },
    );

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('deployment')
        .innerJoinAndSelect('deployment.standardVersions', 'standardVersion')
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
        'Standards deployments listed by organization ID and target IDs successfully',
        {
          organizationId,
          targetIds,
          count: deployments.length,
        },
      );
      return deployments;
    } catch (error) {
      this.logger.error(
        'Failed to list standards deployments by organization ID and target IDs',
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
  ): Promise<StandardsDeployment[]> {
    this.logger.info(
      'Listing standards deployments by organization ID with status filter',
      {
        organizationId,
        status,
      },
    );

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('deployment')
        .innerJoinAndSelect('deployment.standardVersions', 'standardVersion')
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
        'Standards deployments listed by organization ID with status filter successfully',
        {
          organizationId,
          status,
          count: deployments.length,
        },
      );
      return deployments;
    } catch (error) {
      this.logger.error(
        'Failed to list standards deployments by organization ID with status filter',
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
