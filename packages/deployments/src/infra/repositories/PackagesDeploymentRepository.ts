import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import {
  DistributionStatus,
  OrganizationId,
  PackageId,
  Package,
  PackagesDeployment,
  TargetId,
} from '@packmind/types';
import { Repository } from 'typeorm';
import { IPackagesDeploymentRepository } from '../../domain/repositories/IPackagesDeploymentRepository';
import { PackagesDeploymentSchema } from '../schemas/PackagesDeploymentSchema';

const origin = 'PackagesDeploymentRepository';

export class PackagesDeploymentRepository
  extends AbstractRepository<PackagesDeployment>
  implements IPackagesDeploymentRepository
{
  constructor(
    repository: Repository<PackagesDeployment> = localDataSource.getRepository<PackagesDeployment>(
      PackagesDeploymentSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('packagesDeployment', repository, logger, PackagesDeploymentSchema);
    this.logger.info('PackagesDeploymentRepository initialized');
  }

  protected override loggableEntity(
    entity: PackagesDeployment,
  ): Partial<PackagesDeployment> {
    return {
      id: entity.id,
      authorId: entity.authorId,
      organizationId: entity.organizationId,
    };
  }

  async listByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<PackagesDeployment[]> {
    this.logger.info('Listing packages deployments by organization ID', {
      organizationId,
    });

    try {
      const deployments = await this.repository.find({
        where: { organizationId },
        relations: ['packages', 'gitCommit', 'target'],
      });
      this.logger.info(
        'Packages deployments listed by organization ID successfully',
        {
          organizationId,
          count: deployments.length,
        },
      );
      return deployments;
    } catch (error) {
      this.logger.error(
        'Failed to list packages deployments by organization ID',
        {
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async listByPackageId(
    packageId: PackageId,
    organizationId: OrganizationId,
  ): Promise<PackagesDeployment[]> {
    this.logger.info(
      'Listing packages deployments by package ID and organization ID',
      {
        packageId,
        organizationId,
      },
    );

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('deployment')
        .innerJoinAndSelect('deployment.packages', 'package')
        .leftJoinAndSelect('deployment.gitCommit', 'gitCommit')
        .leftJoinAndSelect('deployment.target', 'target')
        .leftJoinAndSelect('target.gitRepo', 'gitRepo')
        .where('package.id = :packageId', {
          packageId: packageId as string,
        })
        .andWhere('deployment.organizationId = :organizationId', {
          organizationId,
        })
        .orderBy('deployment.createdAt', 'DESC');

      const deployments = await queryBuilder.getMany();

      this.logger.info(
        'Packages deployments listed by package ID and organization ID successfully',
        {
          packageId,
          organizationId,
          count: deployments.length,
        },
      );
      return deployments;
    } catch (error) {
      this.logger.error('Failed to list packages deployments by package ID', {
        packageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listByTargetIds(
    organizationId: OrganizationId,
    targetIds: TargetId[],
  ): Promise<PackagesDeployment[]> {
    this.logger.info(
      'Listing packages deployments by organization ID and target IDs',
      {
        organizationId,
        targetIds,
        targetCount: targetIds.length,
      },
    );

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('deployment')
        .innerJoinAndSelect('deployment.packages', 'package')
        .leftJoinAndSelect('deployment.gitCommit', 'gitCommit')
        .leftJoinAndSelect('deployment.target', 'target')
        .where('deployment.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('target.id IN (:...targetIds)', {
          targetIds: targetIds as string[],
        })
        .orderBy('deployment.createdAt', 'DESC');

      const deployments = await queryBuilder.getMany();

      this.logger.info(
        'Packages deployments listed by organization ID and target IDs successfully',
        {
          organizationId,
          targetIdsCount: targetIds.length,
          count: deployments.length,
        },
      );
      return deployments;
    } catch (error) {
      this.logger.error(
        'Failed to list packages deployments by organization ID and target IDs',
        {
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async listByOrganizationIdWithStatus(
    organizationId: OrganizationId,
    status?: DistributionStatus,
  ): Promise<PackagesDeployment[]> {
    this.logger.info(
      'Listing packages deployments by organization ID with status filter',
      {
        organizationId,
        status,
      },
    );

    try {
      const where: {
        organizationId: OrganizationId;
        status?: DistributionStatus;
      } = { organizationId };

      if (status) {
        where.status = status;
      }

      const deployments = await this.repository.find({
        where,
        relations: ['packages', 'gitCommit', 'target'],
        order: { createdAt: 'DESC' },
      });

      this.logger.info(
        'Packages deployments listed by organization ID with status filter successfully',
        {
          organizationId,
          status,
          count: deployments.length,
        },
      );
      return deployments;
    } catch (error) {
      this.logger.error(
        'Failed to list packages deployments by organization ID with status filter',
        {
          organizationId,
          status,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findActivePackagesByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<Package[]> {
    this.logger.info('Finding active packages by target for organization', {
      organizationId,
      targetId,
    });

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('deployment')
        .innerJoinAndSelect('deployment.packages', 'package')
        .where('deployment.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('deployment.target.id = :targetId', { targetId })
        .andWhere('deployment.status = :status', {
          status: DistributionStatus.success,
        })
        .orderBy('deployment.createdAt', 'DESC');

      const deployments = await queryBuilder.getMany();

      // Extract unique packages (latest deployment per package)
      const packageMap = new Map<string, Package>();
      for (const deployment of deployments) {
        for (const pkg of deployment.packages) {
          if (!packageMap.has(pkg.id)) {
            packageMap.set(pkg.id, pkg);
          }
        }
      }

      const packages = Array.from(packageMap.values());

      this.logger.info(
        'Active packages found by target for organization successfully',
        {
          organizationId,
          targetId,
          count: packages.length,
        },
      );
      return packages;
    } catch (error) {
      this.logger.error(
        'Failed to find active packages by target for organization',
        {
          organizationId,
          targetId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
