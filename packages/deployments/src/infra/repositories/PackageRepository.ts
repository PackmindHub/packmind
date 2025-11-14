import { Repository } from 'typeorm';
import {
  Package,
  PackageId,
  PackageWithArtefacts,
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

  async findBySlugsWithArtefacts(
    slugs: string[],
  ): Promise<PackageWithArtefacts[]> {
    if (slugs.length === 0) {
      this.logger.info('No slugs provided to findBySlugsWithArtefacts');
      return [];
    }

    this.logger.info('Finding packages by slugs with artefacts', {
      slugs,
      count: slugs.length,
    });

    try {
      const packages = await this.repository
        .createQueryBuilder('package')
        .leftJoinAndSelect('package.recipes', 'recipes')
        .leftJoinAndSelect('package.standards', 'standards')
        .where('package.slug IN (:...slugs)', { slugs })
        .orderBy('package.createdAt', 'DESC')
        .getMany();

      this.logger.info('Packages found by slugs successfully', {
        requestedCount: slugs.length,
        foundCount: packages.length,
      });

      // TypeORM loads full Recipe[] and Standard[] with leftJoinAndSelect
      return packages as unknown as PackageWithArtefacts[];
    } catch (error) {
      this.logger.error('Failed to find packages by slugs', {
        slugs,
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

  async updatePackageDetails(
    packageId: PackageId,
    name: string,
    description: string,
  ): Promise<void> {
    this.logger.info('Updating package details', {
      packageId,
      name,
    });

    try {
      await this.repository
        .createQueryBuilder()
        .update(PackageSchema)
        .set({ name, description })
        .where('id = :packageId', { packageId })
        .execute();

      this.logger.info('Package details updated successfully', {
        packageId,
      });
    } catch (error) {
      this.logger.error('Failed to update package details', {
        packageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async setRecipes(packageId: PackageId, recipeIds: RecipeId[]): Promise<void> {
    this.logger.info('Setting recipes for package', {
      packageId,
      recipeCount: recipeIds.length,
    });

    try {
      await this.repository
        .createQueryBuilder()
        .delete()
        .from('package_recipes')
        .where('package_id = :packageId', { packageId })
        .execute();

      if (recipeIds.length > 0) {
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
      }

      this.logger.info('Recipes set for package successfully', {
        packageId,
        recipeCount: recipeIds.length,
      });
    } catch (error) {
      this.logger.error('Failed to set recipes for package', {
        packageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async setStandards(
    packageId: PackageId,
    standardIds: StandardId[],
  ): Promise<void> {
    this.logger.info('Setting standards for package', {
      packageId,
      standardCount: standardIds.length,
    });

    try {
      await this.repository
        .createQueryBuilder()
        .delete()
        .from('package_standards')
        .where('package_id = :packageId', { packageId })
        .execute();

      if (standardIds.length > 0) {
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
      }

      this.logger.info('Standards set for package successfully', {
        packageId,
        standardCount: standardIds.length,
      });
    } catch (error) {
      this.logger.error('Failed to set standards for package', {
        packageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
