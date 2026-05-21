import {
  Package,
  PackageArtifactCounts,
  PackageId,
  PackageWithArtefacts,
  RecipeId,
  SpaceId,
  StandardId,
  SkillId,
  OrganizationId,
} from '@packmind/types';
import { IRepository } from '@packmind/types';

export interface IPackageRepository extends IRepository<Package> {
  findBySpaceId(spaceId: SpaceId): Promise<Package[]>;
  findByOrganizationId(organizationId: OrganizationId): Promise<Package[]>;
  findById(id: PackageId): Promise<Package | null>;
  findBySlugsWithArtefacts(
    slugs: string[],
    organizationId: OrganizationId,
  ): Promise<PackageWithArtefacts[]>;
  findBySlugsAndSpaceWithArtefacts(
    slugs: string[],
    spaceId: SpaceId,
  ): Promise<PackageWithArtefacts[]>;
  /**
   * Count recipe/standard/skill artifacts for every package in the given
   * space. The returned map covers all packages in the space, so callers can
   * look up counts directly for any package id without needing to pass the
   * active-package list up front.
   */
  countArtifactsForPackagesInSpace(
    spaceId: SpaceId,
  ): Promise<Map<PackageId, PackageArtifactCounts>>;
  addRecipes(packageId: PackageId, recipeIds: RecipeId[]): Promise<void>;
  addStandards(packageId: PackageId, standardIds: StandardId[]): Promise<void>;
  updatePackageDetails(
    packageId: PackageId,
    name: string,
    description: string,
  ): Promise<void>;
  setRecipes(packageId: PackageId, recipeIds: RecipeId[]): Promise<void>;
  setStandards(packageId: PackageId, standardIds: StandardId[]): Promise<void>;
  addSkills(packageId: PackageId, skillIds: SkillId[]): Promise<void>;
  setSkills(packageId: PackageId, skillIds: SkillId[]): Promise<void>;
  removeRecipeFromAllPackages(recipeId: RecipeId): Promise<void>;
  removeStandardFromAllPackages(standardId: StandardId): Promise<void>;
  removeSkillFromAllPackages(skillId: SkillId): Promise<void>;
}
