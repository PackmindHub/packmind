import { In, Repository } from 'typeorm';
import {
  Package,
  PackageId,
  PackageWithArtefacts,
  Recipe,
  RecipeId,
  SpaceId,
  Standard,
  StandardId,
  Skill,
  SkillId,
  OrganizationId,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import { RecipeSchema } from '@packmind/recipes';
import { StandardSchema, StandardVersionSchema } from '@packmind/standards';
import { SkillSchema } from '@packmind/skills';
import { SpaceSchema } from '@packmind/spaces';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';
import { PackageSchema } from '../schemas/PackageSchema';
import {
  PackageSkillsSchema,
  PackageSkill,
} from '../schemas/PackageSkillsSchema';
import {
  PackageRecipesSchema,
  PackageRecipe,
} from '../schemas/PackageRecipesSchema';
import {
  PackageStandardsSchema,
  PackageStandard,
} from '../schemas/PackageStandardsSchema';

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
    super('package', repository, PackageSchema, logger);
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
      // Fetch packages first
      const packages = await this.repository
        .createQueryBuilder('package')
        .where('package.space_id = :spaceId', { spaceId })
        .orderBy('package.created_at', 'DESC')
        .getMany();

      if (packages.length === 0) {
        this.logger.info('No packages found by space ID', { spaceId });
        return [];
      }

      const packageIds = packages.map((p) => p.id);

      // Fetch recipe relations (relationships are cleaned up when recipes are deleted)
      const recipeRelations: PackageRecipe[] = await this.repository.manager
        .getRepository(PackageRecipesSchema)
        .find({
          where: { package_id: In(packageIds) },
        });

      // Fetch standard relations (relationships are cleaned up when standards are deleted)
      const standardRelations: PackageStandard[] = await this.repository.manager
        .getRepository(PackageStandardsSchema)
        .find({
          where: { package_id: In(packageIds) },
        });

      // Fetch skill relations (relationships are cleaned up when skills are deleted)
      const skillRelations: PackageSkill[] = await this.repository.manager
        .getRepository(PackageSkillsSchema)
        .find({
          where: { package_id: In(packageIds) },
        });

      // Group relations by package ID
      const recipesByPackage = recipeRelations.reduce(
        (acc, rel) => {
          if (!acc[rel.package_id]) acc[rel.package_id] = [];
          acc[rel.package_id].push(rel.recipe_id);
          return acc;
        },
        {} as Record<string, string[]>,
      );

      const standardsByPackage = standardRelations.reduce(
        (acc, rel) => {
          if (!acc[rel.package_id]) acc[rel.package_id] = [];
          acc[rel.package_id].push(rel.standard_id);
          return acc;
        },
        {} as Record<string, string[]>,
      );

      const skillsByPackage = skillRelations.reduce(
        (acc, rel) => {
          if (!acc[rel.package_id]) acc[rel.package_id] = [];
          acc[rel.package_id].push(rel.skill_id);
          return acc;
        },
        {} as Record<string, string[]>,
      );

      const results: Package[] = packages.map((pkg) => ({
        ...pkg,
        recipes: (recipesByPackage[pkg.id] || []) as RecipeId[],
        standards: (standardsByPackage[pkg.id] || []) as StandardId[],
        skills: (skillsByPackage[pkg.id] || []) as SkillId[],
      }));

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
      // Fetch packages first
      const packages = await this.repository
        .createQueryBuilder('package')
        .innerJoin('spaces', 'space', 'package.space_id = space.id')
        .where('space.organization_id = :organizationId', { organizationId })
        .orderBy('package.created_at', 'DESC')
        .getMany();

      if (packages.length === 0) {
        this.logger.info('No packages found by organization ID', {
          organizationId,
        });
        return [];
      }

      const packageIds = packages.map((p) => p.id);

      // Fetch recipe relations (relationships are cleaned up when recipes are deleted)
      const recipeRelations: PackageRecipe[] = await this.repository.manager
        .getRepository(PackageRecipesSchema)
        .find({
          where: { package_id: In(packageIds) },
        });

      // Fetch standard relations (relationships are cleaned up when standards are deleted)
      const standardRelations: PackageStandard[] = await this.repository.manager
        .getRepository(PackageStandardsSchema)
        .find({
          where: { package_id: In(packageIds) },
        });

      // Fetch skill relations (relationships are cleaned up when skills are deleted)
      const skillRelations: PackageSkill[] = await this.repository.manager
        .getRepository(PackageSkillsSchema)
        .find({
          where: { package_id: In(packageIds) },
        });

      // Group relations by package ID
      const recipesByPackage = recipeRelations.reduce(
        (acc, rel) => {
          if (!acc[rel.package_id]) acc[rel.package_id] = [];
          acc[rel.package_id].push(rel.recipe_id);
          return acc;
        },
        {} as Record<string, string[]>,
      );

      const standardsByPackage = standardRelations.reduce(
        (acc, rel) => {
          if (!acc[rel.package_id]) acc[rel.package_id] = [];
          acc[rel.package_id].push(rel.standard_id);
          return acc;
        },
        {} as Record<string, string[]>,
      );

      const skillsByPackage = skillRelations.reduce(
        (acc, rel) => {
          if (!acc[rel.package_id]) acc[rel.package_id] = [];
          acc[rel.package_id].push(rel.skill_id);
          return acc;
        },
        {} as Record<string, string[]>,
      );

      const results: Package[] = packages.map((pkg) => ({
        ...pkg,
        recipes: (recipesByPackage[pkg.id] || []) as RecipeId[],
        standards: (standardsByPackage[pkg.id] || []) as StandardId[],
        skills: (skillsByPackage[pkg.id] || []) as SkillId[],
      }));

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
      // Fetch package first
      const pkg = await this.repository
        .createQueryBuilder('package')
        .where('package.id = :id', { id })
        .getOne();

      if (!pkg) {
        this.logger.info('Package not found', { packageId: id });
        return null;
      }

      // Fetch recipe IDs separately (relationships are cleaned up when recipes are deleted)
      const recipeRelations = await this.repository.manager
        .createQueryBuilder()
        .select('pr.recipe_id', 'recipe_id')
        .from('package_recipes', 'pr')
        .where('pr.package_id = :packageId', { packageId: id })
        .getRawMany();

      // Fetch standard IDs separately (relationships are cleaned up when standards are deleted)
      const standardRelations = await this.repository.manager
        .createQueryBuilder()
        .select('ps.standard_id', 'standard_id')
        .from('package_standards', 'ps')
        .where('ps.package_id = :packageId', { packageId: id })
        .getRawMany();

      // Fetch skill IDs separately (relationships are cleaned up when skills are deleted)
      const skillRelations = await this.repository.manager
        .createQueryBuilder()
        .select('psk.skill_id', 'skill_id')
        .from('package_skills', 'psk')
        .where('psk.package_id = :packageId', { packageId: id })
        .getRawMany();

      const result: Package = {
        ...pkg,
        recipes: recipeRelations.map((r) => r.recipe_id) as RecipeId[],
        standards: standardRelations.map((s) => s.standard_id) as StandardId[],
        skills: skillRelations.map((sk) => sk.skill_id) as SkillId[],
      };

      this.logger.info('Package found by ID successfully', { packageId: id });
      return result;
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
    organizationId: OrganizationId,
  ): Promise<PackageWithArtefacts[]> {
    if (slugs.length === 0) {
      this.logger.info('No slugs provided to findBySlugsWithArtefacts');
      return [];
    }

    this.logger.info('Finding packages by slugs with artefacts', {
      slugs,
      count: slugs.length,
      organizationId,
    });

    try {
      // Find packages by slugs within spaces of the organization
      // First get space IDs for the organization using repository
      const spaces = await this.repository.manager
        .getRepository(SpaceSchema)
        .find({
          where: { organizationId },
          select: ['id'],
        });

      const spaceIds = spaces.map((s) => s.id);

      if (spaceIds.length === 0) {
        return [];
      }

      // Then find packages by slugs within those spaces
      const packages = await this.repository.find({
        where: {
          slug: In(slugs),
          spaceId: In(spaceIds),
        },
      });

      if (packages.length === 0) {
        return [];
      }

      const packageIds = packages.map((p) => p.id);

      const recipeRelations: PackageRecipe[] = await this.repository.manager
        .getRepository(PackageRecipesSchema)
        .find({
          where: { package_id: In(packageIds) },
        });

      const standardRelations: PackageStandard[] = await this.repository.manager
        .getRepository(PackageStandardsSchema)
        .find({
          where: { package_id: In(packageIds) },
        });

      const skillRelations: PackageSkill[] = await this.repository.manager
        .getRepository(PackageSkillsSchema)
        .find({
          where: { package_id: In(packageIds) },
        });

      const uniqueRecipeIds = [
        ...new Set(recipeRelations.map((r) => r.recipe_id)),
      ];
      const uniqueStandardIds = [
        ...new Set(standardRelations.map((s) => s.standard_id)),
      ];
      const uniqueSkillIds = [
        ...new Set(skillRelations.map((s) => s.skill_id)),
      ];

      const recipes: Recipe[] =
        uniqueRecipeIds.length > 0
          ? await this.repository.manager
              .getRepository<Recipe>(RecipeSchema)
              .find({
                where: { id: In(uniqueRecipeIds) },
              })
          : [];

      // Fetch standards
      const standardsEntities =
        uniqueStandardIds.length > 0
          ? await this.repository.manager
              .getRepository<Standard>(StandardSchema)
              .find({
                where: { id: In(uniqueStandardIds) },
              })
          : [];

      // Fetch summaries for standards from standard_versions
      const standardVersionsWithSummary =
        standardsEntities.length > 0
          ? await this.repository.manager
              .getRepository(StandardVersionSchema)
              .find({
                where: { standardId: In(uniqueStandardIds) },
              })
          : [];

      // Create a map for quick lookup of summaries by standard_id and version
      const summaryMap = new Map<string, string>();
      for (const sv of standardVersionsWithSummary) {
        if (sv.summary) {
          summaryMap.set(`${sv.standardId}:${sv.version}`, sv.summary);
        }
      }

      const standards: Standard[] = standardsEntities.map((standard) => ({
        ...standard,
        summary:
          summaryMap.get(`${standard.id}:${standard.version}`) || undefined,
      }));

      const skills: Skill[] =
        uniqueSkillIds.length > 0
          ? await this.repository.manager
              .getRepository<Skill>(SkillSchema)
              .find({
                where: { id: In(uniqueSkillIds) },
              })
          : [];

      const recipesMap = new Map<string, Recipe>(recipes.map((r) => [r.id, r]));
      const standardsMap = new Map<string, Standard>(
        standards.map((s) => [s.id, s]),
      );
      const skillsMap = new Map<string, Skill>(skills.map((s) => [s.id, s]));

      const recipesByPackage = recipeRelations.reduce(
        (acc, rel) => {
          if (!acc[rel.package_id]) acc[rel.package_id] = [];
          const recipe = recipesMap.get(rel.recipe_id);
          if (recipe) acc[rel.package_id].push(recipe);
          return acc;
        },
        {} as Record<string, Recipe[]>,
      );

      const standardsByPackage = standardRelations.reduce(
        (acc, rel) => {
          if (!acc[rel.package_id]) acc[rel.package_id] = [];
          const standard = standardsMap.get(rel.standard_id);
          if (standard) acc[rel.package_id].push(standard);
          return acc;
        },
        {} as Record<string, Standard[]>,
      );

      const skillsByPackage = skillRelations.reduce(
        (acc, rel) => {
          if (!acc[rel.package_id]) acc[rel.package_id] = [];
          const skill = skillsMap.get(rel.skill_id);
          if (skill) acc[rel.package_id].push(skill);
          return acc;
        },
        {} as Record<string, Skill[]>,
      );

      const packagesWithArtefacts: PackageWithArtefacts[] = packages.map(
        (pkg) => ({
          ...pkg,
          recipes: recipesByPackage[pkg.id] || [],
          standards: standardsByPackage[pkg.id] || [],
          skills: skillsByPackage[pkg.id] || [],
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

  async addSkills(packageId: PackageId, skillIds: SkillId[]): Promise<void> {
    if (skillIds.length === 0) {
      return;
    }

    this.logger.info('Adding skills to package', {
      packageId,
      skillCount: skillIds.length,
    });

    try {
      const values = skillIds.map((skillId) => ({
        package_id: packageId,
        skill_id: skillId,
      }));

      await this.repository
        .createQueryBuilder()
        .insert()
        .into('package_skills')
        .values(values)
        .execute();

      this.logger.info('Skills added to package successfully', {
        packageId,
        skillCount: skillIds.length,
      });
    } catch (error) {
      this.logger.error('Failed to add skills to package', {
        packageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async setSkills(packageId: PackageId, skillIds: SkillId[]): Promise<void> {
    this.logger.info('Setting skills for package', {
      packageId,
      skillCount: skillIds.length,
    });

    try {
      await this.repository
        .createQueryBuilder()
        .delete()
        .from('package_skills')
        .where('package_id = :packageId', { packageId })
        .execute();

      if (skillIds.length > 0) {
        const values = skillIds.map((skillId) => ({
          package_id: packageId,
          skill_id: skillId,
        }));

        await this.repository
          .createQueryBuilder()
          .insert()
          .into('package_skills')
          .values(values)
          .execute();
      }

      this.logger.info('Skills set for package successfully', {
        packageId,
        skillCount: skillIds.length,
      });
    } catch (error) {
      this.logger.error('Failed to set skills for package', {
        packageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async removeSkillFromAllPackages(skillId: SkillId): Promise<void> {
    this.logger.info('Removing skill from all packages', { skillId });

    try {
      const result = await this.repository
        .createQueryBuilder()
        .delete()
        .from('package_skills')
        .where('skill_id = :skillId', { skillId })
        .execute();

      this.logger.info('Skill removed from all packages successfully', {
        skillId,
        affectedRows: result.affected ?? 0,
      });
    } catch (error) {
      this.logger.error('Failed to remove skill from all packages', {
        skillId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
