import {
  Package,
  PackageArtifactCounts,
  PackageId,
  CommandId,
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
   * command/standard/skill artefact IDs attached. Cross-domain entity hydration
   * (fetching full commands/standards/skills) is the application layer's job via
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
  addCommands(packageId: PackageId, recipeIds: CommandId[]): Promise<void>;
  addStandards(packageId: PackageId, standardIds: StandardId[]): Promise<void>;
  updatePackageDetails(
    packageId: PackageId,
    name: string,
    description: string,
  ): Promise<void>;
  setCommands(packageId: PackageId, recipeIds: CommandId[]): Promise<void>;
  setStandards(packageId: PackageId, standardIds: StandardId[]): Promise<void>;
  addSkills(packageId: PackageId, skillIds: SkillId[]): Promise<void>;
  setSkills(packageId: PackageId, skillIds: SkillId[]): Promise<void>;
  removeCommandFromAllPackages(recipeId: CommandId): Promise<void>;
  removeStandardFromAllPackages(standardId: StandardId): Promise<void>;
  removeSkillFromAllPackages(skillId: SkillId): Promise<void>;
  removeCommands(packageId: PackageId, recipeIds: CommandId[]): Promise<void>;
  removeStandards(
    packageId: PackageId,
    standardIds: StandardId[],
  ): Promise<void>;
  removeSkills(packageId: PackageId, skillIds: SkillId[]): Promise<void>;
}
