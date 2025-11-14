import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  Package,
  PackageId,
  PackageWithArtefacts,
  RecipeId,
  SpaceId,
  StandardId,
  OrganizationId,
} from '@packmind/types';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';

const origin = 'PackageService';

export class PackageService {
  constructor(
    private readonly packageRepository: IPackageRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('PackageService initialized');
  }

  async findById(packageId: PackageId): Promise<Package | null> {
    this.logger.info('Finding package by ID', {
      packageId,
    });

    try {
      const pkg = await this.packageRepository.findById(packageId);

      if (pkg) {
        this.logger.info('Package found successfully', {
          packageId,
          name: pkg.name,
        });
      } else {
        this.logger.info('Package not found', {
          packageId,
        });
      }

      return pkg;
    } catch (error) {
      this.logger.error('Failed to find package by ID', {
        packageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getPackagesBySpaceId(spaceId: SpaceId): Promise<Package[]> {
    this.logger.info('Getting packages by space ID', {
      spaceId,
    });

    try {
      const packages = await this.packageRepository.findBySpaceId(spaceId);

      this.logger.info('Packages found by space ID successfully', {
        spaceId,
        count: packages.length,
      });

      return packages;
    } catch (error) {
      this.logger.error('Failed to get packages by space ID', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getPackagesByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<Package[]> {
    this.logger.info('Getting packages by organization ID', {
      organizationId,
    });

    try {
      const packages =
        await this.packageRepository.findByOrganizationId(organizationId);

      this.logger.info('Packages found by organization ID successfully', {
        organizationId,
        count: packages.length,
      });

      return packages;
    } catch (error) {
      this.logger.error('Failed to get packages by organization ID', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getPackagesBySlugsWithArtefacts(
    slugs: string[],
  ): Promise<PackageWithArtefacts[]> {
    this.logger.info('Getting packages by slugs with artefacts', {
      slugs,
      count: slugs.length,
    });

    try {
      const packages =
        await this.packageRepository.findBySlugsWithArtefacts(slugs);

      this.logger.info('Packages found by slugs with artefacts successfully', {
        requestedCount: slugs.length,
        foundCount: packages.length,
      });

      return packages;
    } catch (error) {
      this.logger.error('Failed to get packages by slugs with artefacts', {
        slugs,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async createPackage(
    pkg: Omit<Package, 'recipes' | 'standards'>,
    recipeIds: RecipeId[],
    standardIds: StandardId[],
  ): Promise<Package> {
    this.logger.info('Creating package', {
      packageId: pkg.id,
      name: pkg.name,
      recipeCount: recipeIds.length,
      standardCount: standardIds.length,
    });

    try {
      const packageToCreate: Package = {
        ...pkg,
        recipes: [],
        standards: [],
      };

      await this.packageRepository.add(packageToCreate);
      await this.packageRepository.addRecipes(pkg.id, recipeIds);
      await this.packageRepository.addStandards(pkg.id, standardIds);

      const savedPackage = await this.packageRepository.findById(pkg.id);
      if (!savedPackage) {
        throw new Error('Failed to retrieve saved package');
      }

      this.logger.info('Package created successfully', {
        packageId: savedPackage.id,
        name: savedPackage.name,
        recipeCount: savedPackage.recipes?.length ?? 0,
        standardCount: savedPackage.standards?.length ?? 0,
      });

      return savedPackage;
    } catch (error) {
      this.logger.error('Failed to create package', {
        packageId: pkg.id,
        name: pkg.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updatePackage(
    packageId: PackageId,
    name: string,
    description: string,
    recipeIds: RecipeId[],
    standardIds: StandardId[],
  ): Promise<Package> {
    this.logger.info('Updating package', {
      packageId,
      name,
      recipeCount: recipeIds.length,
      standardCount: standardIds.length,
    });

    try {
      await this.packageRepository.updatePackageDetails(
        packageId,
        name,
        description,
      );
      await this.packageRepository.setRecipes(packageId, recipeIds);
      await this.packageRepository.setStandards(packageId, standardIds);

      const updatedPackage = await this.packageRepository.findById(packageId);
      if (!updatedPackage) {
        throw new Error('Failed to retrieve updated package');
      }

      this.logger.info('Package updated successfully', {
        packageId: updatedPackage.id,
        name: updatedPackage.name,
        recipeCount: updatedPackage.recipes?.length ?? 0,
        standardCount: updatedPackage.standards?.length ?? 0,
      });

      return updatedPackage;
    } catch (error) {
      this.logger.error('Failed to update package', {
        packageId,
        name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
