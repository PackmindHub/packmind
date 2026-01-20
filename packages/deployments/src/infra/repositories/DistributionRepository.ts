import { PackmindLogger } from '@packmind/logger';
import { localDataSource } from '@packmind/node-utils';
import {
  Distribution,
  DistributionId,
  DistributionStatus,
  GitCommit,
  OrganizationId,
  PackageId,
  RecipeId,
  RecipeVersion,
  SkillId,
  SkillVersion,
  StandardId,
  StandardVersion,
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
        .leftJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
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
        .leftJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .leftJoinAndSelect('target.gitRepo', 'gitRepo')
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
        .leftJoinAndSelect('target.gitRepo', 'gitRepo')
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
        .leftJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .leftJoinAndSelect('target.gitRepo', 'gitRepo')
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
        .leftJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
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
        .leftJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
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
        .leftJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
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

  async findActiveStandardVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<StandardVersion[]> {
    this.logger.info('Finding active standard versions by target', {
      organizationId,
      targetId,
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
        .where('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('distribution.target_id = :targetId', { targetId })
        .andWhere('distribution.status = :status', {
          status: DistributionStatus.success,
        })
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      // First pass: Track the latest distribution for each package
      // This is needed to handle package removals correctly
      const latestDistributionPerPackage = new Map<
        string,
        {
          operation: string;
          standardVersions: StandardVersion[];
        }
      >();

      for (const distribution of distributions) {
        for (const distributedPackage of distribution.distributedPackages) {
          // Only keep the first (latest) occurrence of each package
          if (!latestDistributionPerPackage.has(distributedPackage.packageId)) {
            latestDistributionPerPackage.set(distributedPackage.packageId, {
              operation: distributedPackage.operation ?? 'add',
              standardVersions: distributedPackage.standardVersions,
            });
          }
        }
      }

      // Second pass: Extract standard versions only from packages whose latest operation is NOT 'remove'
      const standardVersionMap = new Map<string, StandardVersion>();

      for (const [, data] of latestDistributionPerPackage) {
        // Skip packages whose latest distribution was a removal
        if (data.operation === 'remove') {
          continue;
        }

        for (const standardVersion of data.standardVersions) {
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
        totalSuccessfulDistributions: distributions.length,
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

  async findActiveRecipeVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<RecipeVersion[]> {
    this.logger.info('Finding active recipe versions by target', {
      organizationId,
      targetId,
    });

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .leftJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .where('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('distribution.target_id = :targetId', { targetId })
        .andWhere('distribution.status = :status', {
          status: DistributionStatus.success,
        })
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      // First pass: Track the latest distribution for each package
      // This is needed to handle package removals correctly
      const latestDistributionPerPackage = new Map<
        string,
        {
          operation: string;
          recipeVersions: RecipeVersion[];
        }
      >();

      for (const distribution of distributions) {
        for (const distributedPackage of distribution.distributedPackages) {
          // Only keep the first (latest) occurrence of each package
          if (!latestDistributionPerPackage.has(distributedPackage.packageId)) {
            latestDistributionPerPackage.set(distributedPackage.packageId, {
              operation: distributedPackage.operation ?? 'add',
              recipeVersions: distributedPackage.recipeVersions,
            });
          }
        }
      }

      // Second pass: Extract recipe versions only from packages whose latest operation is NOT 'remove'
      const recipeVersionMap = new Map<string, RecipeVersion>();

      for (const [, data] of latestDistributionPerPackage) {
        // Skip packages whose latest distribution was a removal
        if (data.operation === 'remove') {
          continue;
        }

        for (const recipeVersion of data.recipeVersions) {
          // Only keep the first (most recent) version of each recipe
          if (!recipeVersionMap.has(recipeVersion.recipeId)) {
            recipeVersionMap.set(recipeVersion.recipeId, recipeVersion);
          }
        }
      }

      const activeRecipeVersions = Array.from(recipeVersionMap.values());

      this.logger.info('Active recipe versions found by target', {
        organizationId,
        targetId,
        totalSuccessfulDistributions: distributions.length,
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

  async findActiveStandardVersionsByTargetAndPackages(
    organizationId: OrganizationId,
    targetId: TargetId,
    packageIds: PackageId[],
  ): Promise<StandardVersion[]> {
    this.logger.info(
      'Finding active standard versions by target and packages',
      {
        organizationId,
        targetId,
        packageIdsCount: packageIds.length,
      },
    );

    if (packageIds.length === 0) {
      return [];
    }

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
        .where('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('distribution.target_id = :targetId', { targetId })
        .andWhere('distribution.status = :status', {
          status: DistributionStatus.success,
        })
        .andWhere('distributedPackage.packageId IN (:...packageIds)', {
          packageIds: packageIds as string[],
        })
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      // First pass: Track the latest distribution for each package
      const latestDistributionPerPackage = new Map<
        string,
        {
          operation: string;
          standardVersions: StandardVersion[];
        }
      >();

      for (const distribution of distributions) {
        for (const distributedPackage of distribution.distributedPackages) {
          // Only process packages that are in the filter list
          if (!packageIds.includes(distributedPackage.packageId as PackageId)) {
            continue;
          }
          // Only keep the first (latest) occurrence of each package
          if (!latestDistributionPerPackage.has(distributedPackage.packageId)) {
            latestDistributionPerPackage.set(distributedPackage.packageId, {
              operation: distributedPackage.operation ?? 'add',
              standardVersions: distributedPackage.standardVersions,
            });
          }
        }
      }

      // Second pass: Extract standard versions only from packages whose latest operation is NOT 'remove'
      const standardVersionMap = new Map<string, StandardVersion>();

      for (const [, data] of latestDistributionPerPackage) {
        if (data.operation === 'remove') {
          continue;
        }

        for (const standardVersion of data.standardVersions) {
          if (!standardVersionMap.has(standardVersion.standardId)) {
            standardVersionMap.set(standardVersion.standardId, standardVersion);
          }
        }
      }

      const activeStandardVersions = Array.from(standardVersionMap.values());

      this.logger.info(
        'Active standard versions found by target and packages',
        {
          organizationId,
          targetId,
          packageIdsCount: packageIds.length,
          activeStandardVersionsCount: activeStandardVersions.length,
        },
      );

      return activeStandardVersions;
    } catch (error) {
      this.logger.error(
        'Failed to find active standard versions by target and packages',
        {
          organizationId,
          targetId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findActiveRecipeVersionsByTargetAndPackages(
    organizationId: OrganizationId,
    targetId: TargetId,
    packageIds: PackageId[],
  ): Promise<RecipeVersion[]> {
    this.logger.info('Finding active recipe versions by target and packages', {
      organizationId,
      targetId,
      packageIdsCount: packageIds.length,
    });

    if (packageIds.length === 0) {
      return [];
    }

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .innerJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .where('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('distribution.target_id = :targetId', { targetId })
        .andWhere('distribution.status = :status', {
          status: DistributionStatus.success,
        })
        .andWhere('distributedPackage.packageId IN (:...packageIds)', {
          packageIds: packageIds as string[],
        })
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      // First pass: Track the latest distribution for each package
      const latestDistributionPerPackage = new Map<
        string,
        {
          operation: string;
          recipeVersions: RecipeVersion[];
        }
      >();

      for (const distribution of distributions) {
        for (const distributedPackage of distribution.distributedPackages) {
          // Only process packages that are in the filter list
          if (!packageIds.includes(distributedPackage.packageId as PackageId)) {
            continue;
          }
          // Only keep the first (latest) occurrence of each package
          if (!latestDistributionPerPackage.has(distributedPackage.packageId)) {
            latestDistributionPerPackage.set(distributedPackage.packageId, {
              operation: distributedPackage.operation ?? 'add',
              recipeVersions: distributedPackage.recipeVersions,
            });
          }
        }
      }

      // Second pass: Extract recipe versions only from packages whose latest operation is NOT 'remove'
      const recipeVersionMap = new Map<string, RecipeVersion>();

      for (const [, data] of latestDistributionPerPackage) {
        if (data.operation === 'remove') {
          continue;
        }

        for (const recipeVersion of data.recipeVersions) {
          if (!recipeVersionMap.has(recipeVersion.recipeId)) {
            recipeVersionMap.set(recipeVersion.recipeId, recipeVersion);
          }
        }
      }

      const activeRecipeVersions = Array.from(recipeVersionMap.values());

      this.logger.info('Active recipe versions found by target and packages', {
        organizationId,
        targetId,
        packageIdsCount: packageIds.length,
        activeRecipeVersionsCount: activeRecipeVersions.length,
      });

      return activeRecipeVersions;
    } catch (error) {
      this.logger.error(
        'Failed to find active recipe versions by target and packages',
        {
          organizationId,
          targetId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async listBySkillId(
    skillId: SkillId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]> {
    this.logger.info('Listing distributions by skill ID and organization ID', {
      skillId,
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
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .innerJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .leftJoinAndSelect('target.gitRepo', 'gitRepo')
        .where('skillVersion.skillId = :skillId', {
          skillId: skillId as string,
        })
        .andWhere('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      this.logger.info(
        'Distributions listed by skill ID and organization ID successfully',
        {
          skillId,
          organizationId,
          count: distributions.length,
        },
      );
      return distributions;
    } catch (error) {
      this.logger.error('Failed to list distributions by skill ID', {
        skillId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findActivePackageIdsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<PackageId[]> {
    this.logger.info('Finding active package IDs by target', {
      organizationId,
      targetId,
    });

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .innerJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .where('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('distribution.target_id = :targetId', { targetId })
        .andWhere('distribution.status = :status', {
          status: DistributionStatus.success,
        })
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      // Track the latest operation for each package
      const latestOperationPerPackage = new Map<string, string>();

      for (const distribution of distributions) {
        for (const distributedPackage of distribution.distributedPackages) {
          // Only keep the first (latest) occurrence of each package
          if (!latestOperationPerPackage.has(distributedPackage.packageId)) {
            latestOperationPerPackage.set(
              distributedPackage.packageId,
              distributedPackage.operation ?? 'add',
            );
          }
        }
      }

      // Return package IDs where latest operation is NOT 'remove'
      const activePackageIds: PackageId[] = [];
      for (const [packageId, operation] of latestOperationPerPackage) {
        if (operation !== 'remove') {
          activePackageIds.push(packageId as PackageId);
        }
      }

      this.logger.info('Active package IDs found by target', {
        organizationId,
        targetId,
        totalPackagesTracked: latestOperationPerPackage.size,
        activePackageCount: activePackageIds.length,
      });

      return activePackageIds;
    } catch (error) {
      this.logger.error('Failed to find active package IDs by target', {
        organizationId,
        targetId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findActiveSkillVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<SkillVersion[]> {
    this.logger.info('Finding active skill versions by target', {
      organizationId,
      targetId,
    });

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .leftJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
        .where('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('distribution.target_id = :targetId', { targetId })
        .andWhere('distribution.status = :status', {
          status: DistributionStatus.success,
        })
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      // First pass: Track the latest distribution for each package
      // This is needed to handle package removals correctly
      const latestDistributionPerPackage = new Map<
        string,
        {
          operation: string;
          skillVersions: SkillVersion[];
        }
      >();

      for (const distribution of distributions) {
        for (const distributedPackage of distribution.distributedPackages) {
          // Only keep the first (latest) occurrence of each package
          if (!latestDistributionPerPackage.has(distributedPackage.packageId)) {
            latestDistributionPerPackage.set(distributedPackage.packageId, {
              operation: distributedPackage.operation ?? 'add',
              skillVersions: distributedPackage.skillVersions,
            });
          }
        }
      }

      // Second pass: Extract skill versions only from packages whose latest operation is NOT 'remove'
      const skillVersionMap = new Map<string, SkillVersion>();

      for (const [, data] of latestDistributionPerPackage) {
        // Skip packages whose latest distribution was a removal
        if (data.operation === 'remove') {
          continue;
        }

        for (const skillVersion of data.skillVersions) {
          // Only keep the first (most recent) version of each skill
          if (!skillVersionMap.has(skillVersion.skillId)) {
            skillVersionMap.set(skillVersion.skillId, skillVersion);
          }
        }
      }

      const activeSkillVersions = Array.from(skillVersionMap.values());

      this.logger.info('Active skill versions found by target', {
        organizationId,
        targetId,
        totalSuccessfulDistributions: distributions.length,
        activeSkillVersionsCount: activeSkillVersions.length,
        skillIds: activeSkillVersions.map((sv) => sv.skillId),
      });

      return activeSkillVersions;
    } catch (error) {
      this.logger.error('Failed to find active skill versions by target', {
        organizationId,
        targetId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findActiveSkillVersionsByTargetAndPackages(
    organizationId: OrganizationId,
    targetId: TargetId,
    packageIds: PackageId[],
  ): Promise<SkillVersion[]> {
    this.logger.info('Finding active skill versions by target and packages', {
      organizationId,
      targetId,
      packageIdsCount: packageIds.length,
    });

    if (packageIds.length === 0) {
      return [];
    }

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .innerJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
        .where('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('distribution.target_id = :targetId', { targetId })
        .andWhere('distribution.status = :status', {
          status: DistributionStatus.success,
        })
        .andWhere('distributedPackage.packageId IN (:...packageIds)', {
          packageIds: packageIds as string[],
        })
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      // First pass: Track the latest distribution for each package
      const latestDistributionPerPackage = new Map<
        string,
        {
          operation: string;
          skillVersions: SkillVersion[];
        }
      >();

      for (const distribution of distributions) {
        for (const distributedPackage of distribution.distributedPackages) {
          // Only process packages that are in the filter list
          if (!packageIds.includes(distributedPackage.packageId as PackageId)) {
            continue;
          }
          // Only keep the first (latest) occurrence of each package
          if (!latestDistributionPerPackage.has(distributedPackage.packageId)) {
            latestDistributionPerPackage.set(distributedPackage.packageId, {
              operation: distributedPackage.operation ?? 'add',
              skillVersions: distributedPackage.skillVersions,
            });
          }
        }
      }

      // Second pass: Extract skill versions only from packages whose latest operation is NOT 'remove'
      const skillVersionMap = new Map<string, SkillVersion>();

      for (const [, data] of latestDistributionPerPackage) {
        if (data.operation === 'remove') {
          continue;
        }

        for (const skillVersion of data.skillVersions) {
          if (!skillVersionMap.has(skillVersion.skillId)) {
            skillVersionMap.set(skillVersion.skillId, skillVersion);
          }
        }
      }

      const activeSkillVersions = Array.from(skillVersionMap.values());

      this.logger.info('Active skill versions found by target and packages', {
        organizationId,
        targetId,
        packageIdsCount: packageIds.length,
        activeSkillVersionsCount: activeSkillVersions.length,
      });

      return activeSkillVersions;
    } catch (error) {
      this.logger.error(
        'Failed to find active skill versions by target and packages',
        {
          organizationId,
          targetId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async updateStatus(
    id: DistributionId,
    status: DistributionStatus,
    gitCommit?: GitCommit,
    error?: string,
  ): Promise<Distribution> {
    this.logger.info('Updating distribution status', {
      distributionId: id,
      status,
      hasGitCommit: !!gitCommit,
      hasError: !!error,
    });

    try {
      const distribution = await this.findById(id);

      if (!distribution) {
        this.logger.error('Distribution not found for status update', {
          distributionId: id,
        });
        throw new Error(`Distribution not found: ${id}`);
      }

      distribution.status = status;

      if (gitCommit) {
        distribution.gitCommit = gitCommit;
      }

      if (error) {
        distribution.error = error;
      }

      const updatedDistribution = await this.repository.save(distribution);

      this.logger.info('Distribution status updated successfully', {
        distributionId: id,
        status,
      });

      return updatedDistribution;
    } catch (error) {
      this.logger.error('Failed to update distribution status', {
        distributionId: id,
        status,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
