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
        relations: ['standardVersions', 'gitRepos', 'gitCommits'],
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
        .leftJoinAndSelect('deployment.gitRepos', 'gitRepos')
        .leftJoinAndSelect('deployment.gitCommits', 'gitCommits')
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
        .leftJoinAndSelect('deployment.gitRepos', 'gitRepo')
        .leftJoinAndSelect('deployment.gitCommits', 'gitCommits')
        .where('deployment.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('gitRepo.id IN (:...gitRepoIds)', { gitRepoIds })
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
      // Find all deployments to this repository for this organization
      const deployments = await this.repository
        .createQueryBuilder('deployment')
        .leftJoinAndSelect('deployment.standardVersions', 'standardVersion')
        .leftJoinAndSelect('deployment.gitRepos', 'gitRepo')
        .where('deployment.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('gitRepo.id = :gitRepoId', { gitRepoId })
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
        totalDeployments: deployments.length,
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
}
