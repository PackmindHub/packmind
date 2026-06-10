import {
  Package,
  PackageArtifactCounts,
  PackageId,
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
  /**
   * Find packages matching the given slugs within the given spaces, with their
   * recipe/standard/skill artefact IDs attached. Cross-domain entity hydration
   * (fetching full recipes/standards/skills) is the application layer's job via
   * ports — the repository only reads its own aggregate and junction tables.
   */
  findBySlugsAndSpaceIds(
    slugs: string[],
    spaceIds: SpaceId[],
  ): Promise<Package[]>;
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
