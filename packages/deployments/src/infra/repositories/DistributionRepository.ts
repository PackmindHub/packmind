import { PackmindLogger } from '@packmind/logger';
import { localDataSource } from '@packmind/node-utils';
import {
  Distribution,
  DistributionId,
  DistributionStatus,
  OrganizationId,
  PackageId,
  RecipeId,
  StandardId,
  TargetId,
} from '@packmind/types';
import { Repository } from 'typeorm';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { DistributionSchema } from '../schemas/DistributionSchema';

const origin = 'DistributionRepository';

export class DistributionRepository implements IDistributionRepository {
  constructor(
    private readonly repository: Repository<Distribution> = localDataSource.getRepository<Distribution>(
      DistributionSchema,
    ),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('DistributionRepository initialized');
  }

  private loggableEntity(entity: Distribution): Partial<Distribution> {
    return {
      id: entity.id,
      authorId: entity.authorId,
      organizationId: entity.organizationId,
      status: entity.status,
    };
  }

  async add(distribution: Distribution): Promise<Distribution> {
    this.logger.info('Adding distribution to database', {
      id: distribution.id,
    });

    try {
      const savedDistribution = await this.repository.save(distribution);
      this.logger.info('Saved distribution to database successfully', {
        id: savedDistribution.id,
      });
      return savedDistribution;
    } catch (error) {
      this.logger.error('Failed to save distribution to database', {
        id: distribution.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<Distribution[]> {
    this.logger.info('Listing distributions by organization ID', {
      organizationId,
    });

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .leftJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .where('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      this.logger.info('Distributions listed by organization ID successfully', {
        organizationId,
        count: distributions.length,
      });
      return distributions;
    } catch (error) {
      this.logger.error('Failed to list distributions by organization ID', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listByPackageId(
    packageId: PackageId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]> {
    this.logger.info(
      'Listing distributions by package ID and organization ID',
      {
        packageId,
        organizationId,
      },
    );

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .innerJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .where('distributedPackage.packageId = :packageId', {
          packageId: packageId as string,
        })
        .andWhere('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      this.logger.info(
        'Distributions listed by package ID and organization ID successfully',
        {
          packageId,
          organizationId,
          count: distributions.length,
        },
      );
      return distributions;
    } catch (error) {
      this.logger.error('Failed to list distributions by package ID', {
        packageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listByRecipeId(
    recipeId: RecipeId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]> {
    this.logger.info('Listing distributions by recipe ID and organization ID', {
      recipeId,
      organizationId,
    });

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .innerJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect('distributedPackage.package', 'package')
        .leftJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .innerJoinAndSelect(
          'distributedPackage.recipeVersions',
          'recipeVersion',
        )
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .where('recipeVersion.recipeId = :recipeId', {
          recipeId: recipeId as string,
        })
        .andWhere('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      this.logger.info(
        'Distributions listed by recipe ID and organization ID successfully',
        {
          recipeId,
          organizationId,
          count: distributions.length,
        },
      );
      return distributions;
    } catch (error) {
      this.logger.error('Failed to list distributions by recipe ID', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listByStandardId(
    standardId: StandardId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]> {
    this.logger.info(
      'Listing distributions by standard ID and organization ID',
      {
        standardId,
        organizationId,
      },
    );

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .innerJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect('distributedPackage.package', 'package')
        .innerJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .where('standardVersion.standardId = :standardId', {
          standardId: standardId as string,
        })
        .andWhere('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      this.logger.info(
        'Distributions listed by standard ID and organization ID successfully',
        {
          standardId,
          organizationId,
          count: distributions.length,
        },
      );
      return distributions;
    } catch (error) {
      this.logger.error('Failed to list distributions by standard ID', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listByTargetIds(
    organizationId: OrganizationId,
    targetIds: TargetId[],
  ): Promise<Distribution[]> {
    this.logger.info(
      'Listing distributions by organization ID and target IDs',
      {
        organizationId,
        targetIds,
        targetCount: targetIds.length,
      },
    );

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .leftJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .where('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('distribution.target_id IN (:...targetIds)', {
          targetIds: targetIds as string[],
        })
        .orderBy('distribution.createdAt', 'ASC')
        .getMany();

      this.logger.info(
        'Distributions listed by organization ID and target IDs successfully',
        {
          organizationId,
          targetIds,
          count: distributions.length,
        },
      );
      return distributions;
    } catch (error) {
      this.logger.error(
        'Failed to list distributions by organization ID and target IDs',
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
  ): Promise<Distribution[]> {
    this.logger.info(
      'Listing distributions by organization ID with status filter',
      {
        organizationId,
        status,
      },
    );

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('distribution')
        .leftJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .where('distribution.organizationId = :organizationId', {
          organizationId,
        });

      if (status) {
        queryBuilder.andWhere('distribution.status = :status', { status });
      }

      queryBuilder.orderBy('distribution.createdAt', 'DESC');

      const distributions = await queryBuilder.getMany();

      this.logger.info(
        'Distributions listed by organization ID with status filter successfully',
        {
          organizationId,
          status,
          count: distributions.length,
        },
      );
      return distributions;
    } catch (error) {
      this.logger.error(
        'Failed to list distributions by organization ID with status filter',
        {
          organizationId,
          status,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findById(id: DistributionId): Promise<Distribution | null> {
    this.logger.info('Finding distribution by ID', { distributionId: id });

    try {
      const distribution = await this.repository
        .createQueryBuilder('distribution')
        .leftJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .where('distribution.id = :id', { id })
        .getOne();

      if (!distribution) {
        this.logger.info('Distribution not found', { distributionId: id });
        return null;
      }

      this.logger.info('Distribution found by ID successfully', {
        distributionId: id,
      });
      return distribution;
    } catch (error) {
      this.logger.error('Failed to find distribution by ID', {
        distributionId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
