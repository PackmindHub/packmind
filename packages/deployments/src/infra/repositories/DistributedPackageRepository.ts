import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import {
  DistributedPackage,
  DistributedPackageId,
  DistributionId,
  PackageId,
  RecipeVersionId,
  SkillVersionId,
  StandardVersionId,
} from '@packmind/types';
import { Repository } from 'typeorm';
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';
import { DistributedPackageSchema } from '../schemas/DistributedPackageSchema';

const origin = 'DistributedPackageRepository';

export class DistributedPackageRepository
  extends AbstractRepository<DistributedPackage>
  implements IDistributedPackageRepository
{
  constructor(
    repository: Repository<DistributedPackage> = localDataSource.getRepository<DistributedPackage>(
      DistributedPackageSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('distributedPackage', repository, DistributedPackageSchema, logger);
    this.logger.info('DistributedPackageRepository initialized');
  }

  protected override loggableEntity(
    entity: DistributedPackage,
  ): Partial<DistributedPackage> {
    return {
      id: entity.id,
      distributionId: entity.distributionId,
      packageId: entity.packageId,
    };
  }

  async findByDistributionId(
    distributionId: DistributionId,
  ): Promise<DistributedPackage[]> {
    this.logger.info('Finding distributed packages by distribution ID', {
      distributionId,
    });

    try {
      const distributedPackages = await this.repository
        .createQueryBuilder('distributedPackage')
        .leftJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .where('distributedPackage.distributionId = :distributionId', {
          distributionId,
        })
        .getMany();

      this.logger.info(
        'Distributed packages found by distribution ID successfully',
        {
          distributionId,
          count: distributedPackages.length,
        },
      );
      return distributedPackages;
    } catch (error) {
      this.logger.error(
        'Failed to find distributed packages by distribution ID',
        {
          distributionId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findByPackageId(packageId: PackageId): Promise<DistributedPackage[]> {
    this.logger.info('Finding distributed packages by package ID', {
      packageId,
    });

    try {
      const distributedPackages = await this.repository
        .createQueryBuilder('distributedPackage')
        .leftJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .where('distributedPackage.packageId = :packageId', {
          packageId,
        })
        .getMany();

      this.logger.info(
        'Distributed packages found by package ID successfully',
        {
          packageId,
          count: distributedPackages.length,
        },
      );
      return distributedPackages;
    } catch (error) {
      this.logger.error('Failed to find distributed packages by package ID', {
        packageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async addStandardVersions(
    distributedPackageId: DistributedPackageId,
    standardVersionIds: StandardVersionId[],
  ): Promise<void> {
    if (standardVersionIds.length === 0) {
      return;
    }

    this.logger.info('Adding standard versions to distributed package', {
      distributedPackageId,
      standardVersionCount: standardVersionIds.length,
    });

    try {
      const values = standardVersionIds.map((standardVersionId) => ({
        distributed_package_id: distributedPackageId,
        standard_version_id: standardVersionId,
      }));

      await this.repository
        .createQueryBuilder()
        .insert()
        .into('distributed_package_standard_versions')
        .values(values)
        .execute();

      this.logger.info(
        'Standard versions added to distributed package successfully',
        {
          distributedPackageId,
          standardVersionCount: standardVersionIds.length,
        },
      );
    } catch (error) {
      this.logger.error(
        'Failed to add standard versions to distributed package',
        {
          distributedPackageId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async addRecipeVersions(
    distributedPackageId: DistributedPackageId,
    recipeVersionIds: RecipeVersionId[],
  ): Promise<void> {
    if (recipeVersionIds.length === 0) {
      return;
    }

    this.logger.info('Adding recipe versions to distributed package', {
      distributedPackageId,
      recipeVersionCount: recipeVersionIds.length,
    });

    try {
      const values = recipeVersionIds.map((recipeVersionId) => ({
        distributed_package_id: distributedPackageId,
        recipe_version_id: recipeVersionId,
      }));

      await this.repository
        .createQueryBuilder()
        .insert()
        .into('distributed_package_recipe_versions')
        .values(values)
        .execute();

      this.logger.info(
        'Recipe versions added to distributed package successfully',
        {
          distributedPackageId,
          recipeVersionCount: recipeVersionIds.length,
        },
      );
    } catch (error) {
      this.logger.error(
        'Failed to add recipe versions to distributed package',
        {
          distributedPackageId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async addSkillVersions(
    distributedPackageId: DistributedPackageId,
    skillVersionIds: SkillVersionId[],
  ): Promise<void> {
    if (skillVersionIds.length === 0) {
      return;
    }

    this.logger.info('Adding skill versions to distributed package', {
      distributedPackageId,
      skillVersionCount: skillVersionIds.length,
    });

    try {
      const values = skillVersionIds.map((skillVersionId) => ({
        distributed_package_id: distributedPackageId,
        skill_version_id: skillVersionId,
      }));

      await this.repository
        .createQueryBuilder()
        .insert()
        .into('distributed_package_skill_versions')
        .values(values)
        .execute();

      this.logger.info(
        'Skill versions added to distributed package successfully',
        {
          distributedPackageId,
          skillVersionCount: skillVersionIds.length,
        },
      );
    } catch (error) {
      this.logger.error('Failed to add skill versions to distributed package', {
        distributedPackageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
