import { Repository } from 'typeorm';
import {
  Package,
  PackageId,
  RecipeId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';
import { PackageSchema } from '../schemas/PackageSchema';

const origin = 'PackageRepository';

export class PackageRepository
  extends AbstractRepository<Package>
  implements IPackageRepository
{
  constructor(
    repository: Repository<Package> = localDataSource.getRepository<Package>(
      PackageSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('package', repository, logger, PackageSchema);
    this.logger.info('PackageRepository initialized');
  }

  protected override loggableEntity(pkg: Package): Partial<Package> {
    return {
      id: pkg.id,
      name: pkg.name,
      slug: pkg.slug,
      spaceId: pkg.spaceId,
    };
  }

  async findBySpaceId(spaceId: SpaceId): Promise<Package[]> {
    this.logger.info('Finding packages by space ID', {
      spaceId,
    });

    try {
      const packages = await this.repository
        .createQueryBuilder('package')
        .leftJoinAndSelect('package.recipes', 'recipes')
        .leftJoinAndSelect('package.standards', 'standards')
        .where('package.spaceId = :spaceId', { spaceId })
        .orderBy('package.createdAt', 'DESC')
        .getMany();

      this.logger.info('Packages found by space ID successfully', {
        spaceId,
        count: packages.length,
      });

      return packages;
    } catch (error) {
      this.logger.error('Failed to find packages by space ID', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  override async findById(id: PackageId): Promise<Package | null> {
    this.logger.info('Finding package by ID', { packageId: id });

    try {
      const pkg = await this.repository
        .createQueryBuilder('package')
        .leftJoinAndSelect('package.recipes', 'recipes')
        .leftJoinAndSelect('package.standards', 'standards')
        .where('package.id = :id', { id })
        .getOne();

      if (!pkg) {
        this.logger.info('Package not found', { packageId: id });
        return null;
      }

      this.logger.info('Package found by ID successfully', {
        packageId: id,
      });

      return pkg;
    } catch (error) {
      this.logger.error('Failed to find package by ID', {
        packageId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async addRecipes(packageId: PackageId, recipeIds: RecipeId[]): Promise<void> {
    if (recipeIds.length === 0) {
      return;
    }

    this.logger.info('Adding recipes to package', {
      packageId,
      recipeCount: recipeIds.length,
    });

    try {
      const values = recipeIds.map((recipeId) => ({
        package_id: packageId,
        recipe_id: recipeId,
      }));

      await this.repository
        .createQueryBuilder()
        .insert()
        .into('package_recipes')
        .values(values)
        .execute();

      this.logger.info('Recipes added to package successfully', {
        packageId,
        recipeCount: recipeIds.length,
      });
    } catch (error) {
      this.logger.error('Failed to add recipes to package', {
        packageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async addStandards(
    packageId: PackageId,
    standardIds: StandardId[],
  ): Promise<void> {
    if (standardIds.length === 0) {
      return;
    }

    this.logger.info('Adding standards to package', {
      packageId,
      standardCount: standardIds.length,
    });

    try {
      const values = standardIds.map((standardId) => ({
        package_id: packageId,
        standard_id: standardId,
      }));

      await this.repository
        .createQueryBuilder()
        .insert()
        .into('package_standards')
        .values(values)
        .execute();

      this.logger.info('Standards added to package successfully', {
        packageId,
        standardCount: standardIds.length,
      });
    } catch (error) {
      this.logger.error('Failed to add standards to package', {
        packageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
