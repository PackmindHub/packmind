import { Repository } from 'typeorm';
import {
  Package,
  PackageId,
  PackageWithArtefacts,
  RecipeId,
  SpaceId,
  StandardId,
  OrganizationId,
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
    this.logger.info('Finding packages by space ID', { spaceId });

    try {
      const results = await this.repository
        .createQueryBuilder('package')
        .select([
          'package.id as id',
          'package.name as name',
          'package.slug as slug',
          'package.description as description',
          'package.spaceId as "spaceId"',
          'package.createdBy as "createdBy"',
          'package.createdAt as "createdAt"',
          'package.updatedAt as "updatedAt"',
          'package.deletedAt as "deletedAt"',
          'package.deletedBy as "deletedBy"',
          `COALESCE(array_agg(DISTINCT pr.recipe_id) FILTER (WHERE pr.recipe_id IS NOT NULL), '{}') as recipes`,
          `COALESCE(array_agg(DISTINCT ps.standard_id) FILTER (WHERE ps.standard_id IS NOT NULL), '{}') as standards`,
        ])
        .leftJoin('package_recipes', 'pr', 'package.id = pr.package_id')
        .leftJoin('package_standards', 'ps', 'package.id = ps.package_id')
        .where('package.spaceId = :spaceId', { spaceId })
        .andWhere('package.deletedAt IS NULL')
        .groupBy('package.id')
        .orderBy('package.createdAt', 'DESC')
        .getRawMany();

      this.logger.info('Packages found by space ID successfully', {
        spaceId,
        count: results.length,
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to find packages by space ID', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<Package[]> {
    this.logger.info('Finding packages by organization ID', {
      organizationId,
    });

    try {
      const results = await this.repository
        .createQueryBuilder('package')
        .select([
          'package.id as id',
          'package.name as name',
          'package.slug as slug',
          'package.description as description',
          'package.spaceId as "spaceId"',
          'package.createdBy as "createdBy"',
          'package.createdAt as "createdAt"',
          'package.updatedAt as "updatedAt"',
          'package.deletedAt as "deletedAt"',
          'package.deletedBy as "deletedBy"',
          `COALESCE(array_agg(DISTINCT pr.recipe_id) FILTER (WHERE pr.recipe_id IS NOT NULL), '{}') as recipes`,
          `COALESCE(array_agg(DISTINCT ps.standard_id) FILTER (WHERE ps.standard_id IS NOT NULL), '{}') as standards`,
        ])
        .innerJoin('spaces', 's', 'package.spaceId = s.id')
        .leftJoin('package_recipes', 'pr', 'package.id = pr.package_id')
        .leftJoin('package_standards', 'ps', 'package.id = ps.package_id')
        .where('s.organizationId = :organizationId', { organizationId })
        .andWhere('package.deletedAt IS NULL')
        .groupBy('package.id')
        .orderBy('package.createdAt', 'DESC')
        .getRawMany();

      this.logger.info('Packages found by organization ID successfully', {
        organizationId,
        count: results.length,
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to find packages by organization ID', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  override async findById(id: PackageId): Promise<Package | null> {
    this.logger.info('Finding package by ID', { packageId: id });

    try {
      const results = await this.repository
        .createQueryBuilder('package')
        .select([
          'package.id as id',
          'package.name as name',
          'package.slug as slug',
          'package.description as description',
          'package.spaceId as "spaceId"',
          'package.createdBy as "createdBy"',
          'package.createdAt as "createdAt"',
          'package.updatedAt as "updatedAt"',
          'package.deletedAt as "deletedAt"',
          'package.deletedBy as "deletedBy"',
          `COALESCE(array_agg(DISTINCT pr.recipe_id) FILTER (WHERE pr.recipe_id IS NOT NULL), '{}') as recipes`,
          `COALESCE(array_agg(DISTINCT ps.standard_id) FILTER (WHERE ps.standard_id IS NOT NULL), '{}') as standards`,
        ])
        .leftJoin('package_recipes', 'pr', 'package.id = pr.package_id')
        .leftJoin('package_standards', 'ps', 'package.id = ps.package_id')
        .where('package.id = :id', { id })
        .groupBy('package.id')
        .getRawMany();

      if (results.length === 0) {
        this.logger.info('Package not found', { packageId: id });
        return null;
      }

      this.logger.info('Package found by ID successfully', { packageId: id });
      return results[0];
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
        .where('package.slug IN (:...slugs)', { slugs })
        .orderBy('package.createdAt', 'DESC')
        .getMany();

      if (packages.length === 0) {
        return [];
      }

      const packageIds = packages.map((p) => p.id);

      const recipeRelations = await this.repository.manager
        .createQueryBuilder()
        .select(['pr.package_id as package_id', 'pr.recipe_id as recipe_id'])
        .from('package_recipes', 'pr')
        .where('pr.package_id IN (:...packageIds)', { packageIds })
        .getRawMany();

      const standardRelations = await this.repository.manager
        .createQueryBuilder()
        .select([
          'ps.package_id as package_id',
          'ps.standard_id as standard_id',
        ])
        .from('package_standards', 'ps')
        .where('ps.package_id IN (:...packageIds)', { packageIds })
        .getRawMany();

      const uniqueRecipeIds = [
        ...new Set(recipeRelations.map((r) => r.recipe_id)),
      ];
      const uniqueStandardIds = [
        ...new Set(standardRelations.map((s) => s.standard_id)),
      ];

      const recipes =
        uniqueRecipeIds.length > 0
          ? await this.repository.manager
              .createQueryBuilder()
              .select('recipe')
              .from('recipes', 'recipe')
              .where('recipe.id IN (:...recipeIds)', {
                recipeIds: uniqueRecipeIds,
              })
              .getMany()
          : [];

      const standards =
        uniqueStandardIds.length > 0
          ? await this.repository.manager
              .createQueryBuilder()
              .select([
                'standard.id',
                'standard.name',
                'standard.slug',
                'standard.description',
                'standard.version',
                'standard.git_commit_id',
                'standard.user_id',
                'standard.scope',
                'standard.space_id',
                'standard.created_at',
                'standard.updated_at',
                'standard.deleted_at',
                'standard.deleted_by',
                'sv.summary',
              ])
              .from('standards', 'standard')
              .leftJoin(
                'standard_versions',
                'sv',
                'standard.id = sv.standard_id AND standard.version = sv.version',
              )
              .where('standard.id IN (:...standardIds)', {
                standardIds: uniqueStandardIds,
              })
              .getRawMany()
              .then((rows) =>
                rows.map((row) => ({
                  id: row.standard_id,
                  name: row.standard_name,
                  slug: row.standard_slug,
                  description: row.standard_description,
                  version: row.standard_version,
                  gitCommitId: row.standard_git_commit_id,
                  userId: row.standard_user_id,
                  scope: row.standard_scope,
                  spaceId: row.standard_space_id,
                  createdAt: row.standard_created_at,
                  updatedAt: row.standard_updated_at,
                  deletedAt: row.standard_deleted_at,
                  deletedBy: row.standard_deleted_by,
                  summary: row.sv_summary || undefined,
                })),
              )
          : [];

      const recipesMap = new Map(recipes.map((r) => [r['id'], r]));
      const standardsMap = new Map(standards.map((s) => [s['id'], s]));

      const recipesByPackage = recipeRelations.reduce(
        (acc, rel) => {
          if (!acc[rel.package_id]) acc[rel.package_id] = [];
          const recipe = recipesMap.get(rel.recipe_id);
          if (recipe) acc[rel.package_id].push(recipe);
          return acc;
        },
        {} as Record<string, typeof recipes>,
      );

      const standardsByPackage = standardRelations.reduce(
        (acc, rel) => {
          if (!acc[rel.package_id]) acc[rel.package_id] = [];
          const standard = standardsMap.get(rel.standard_id);
          if (standard) acc[rel.package_id].push(standard);
          return acc;
        },
        {} as Record<string, typeof standards>,
      );

      const packagesWithArtefacts: PackageWithArtefacts[] = packages.map(
        (pkg) => ({
          ...pkg,
          recipes: recipesByPackage[pkg.id] || [],
          standards: standardsByPackage[pkg.id] || [],
        }),
      );

      this.logger.info('Packages found by slugs successfully', {
        requestedCount: slugs.length,
        foundCount: packagesWithArtefacts.length,
      });

      return packagesWithArtefacts;
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

  async removeRecipeFromAllPackages(recipeId: RecipeId): Promise<void> {
    this.logger.info('Removing recipe from all packages', { recipeId });

    try {
      const result = await this.repository
        .createQueryBuilder()
        .delete()
        .from('package_recipes')
        .where('recipe_id = :recipeId', { recipeId })
        .execute();

      this.logger.info('Recipe removed from all packages successfully', {
        recipeId,
        affectedRows: result.affected ?? 0,
      });
    } catch (error) {
      this.logger.error('Failed to remove recipe from all packages', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async removeStandardFromAllPackages(standardId: StandardId): Promise<void> {
    this.logger.info('Removing standard from all packages', { standardId });

    try {
      const result = await this.repository
        .createQueryBuilder()
        .delete()
        .from('package_standards')
        .where('standard_id = :standardId', { standardId })
        .execute();

      this.logger.info('Standard removed from all packages successfully', {
        standardId,
        affectedRows: result.affected ?? 0,
      });
    } catch (error) {
      this.logger.error('Failed to remove standard from all packages', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
