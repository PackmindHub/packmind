import {
  Distribution,
  DistributionId,
  DistributionStatus,
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

export interface IDistributionRepository {
  add(distribution: Distribution): Promise<Distribution>;

  findById(id: DistributionId): Promise<Distribution | null>;

  listByOrganizationId(organizationId: OrganizationId): Promise<Distribution[]>;

  listByPackageId(
    packageId: PackageId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]>;

  listByRecipeId(
    recipeId: RecipeId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]>;

  listByStandardId(
    standardId: StandardId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]>;

  listBySkillId(
    skillId: SkillId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]>;

  listByTargetIds(
    organizationId: OrganizationId,
    targetIds: TargetId[],
  ): Promise<Distribution[]>;

  listByOrganizationIdWithStatus(
    organizationId: OrganizationId,
    status?: DistributionStatus,
  ): Promise<Distribution[]>;

  /**
   * Get all currently distributed standard versions for a specific target.
   * This returns the latest distributed version of each unique standard.
   * Used to generate complete standard books that include all distributed standards.
   */
  findActiveStandardVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<StandardVersion[]>;

  /**
   * Get all currently distributed recipe versions for a specific target.
   * This returns the latest distributed version of each unique recipe.
   * Used to generate complete recipe books that include all distributed recipes.
   */
  findActiveRecipeVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<RecipeVersion[]>;

  /**
   * Get currently distributed standard versions for a specific target,
   * filtered by the specified packages.
   * This returns the latest distributed version of each unique standard
   * that belongs to one of the specified packages.
   * Used to compute removed artifacts only from packages being deployed.
   */
  findActiveStandardVersionsByTargetAndPackages(
    organizationId: OrganizationId,
    targetId: TargetId,
    packageIds: PackageId[],
  ): Promise<StandardVersion[]>;

  /**
   * Get currently distributed recipe versions for a specific target,
   * filtered by the specified packages.
   * This returns the latest distributed version of each unique recipe
   * that belongs to one of the specified packages.
   * Used to compute removed artifacts only from packages being deployed.
   */
  findActiveRecipeVersionsByTargetAndPackages(
    organizationId: OrganizationId,
    targetId: TargetId,
    packageIds: PackageId[],
  ): Promise<RecipeVersion[]>;

  /**
   * Get all currently distributed skill versions for a specific target.
   * This returns the latest distributed version of each unique skill.
   * Used to generate complete skill books that include all distributed skills.
   * TODO: Implement when skill-package relationship and distribution tracking is ready
   */
  findActiveSkillVersionsByTarget?(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<SkillVersion[]>;

  /**
   * Get currently distributed skill versions for a specific target,
   * filtered by the specified packages.
   * This returns the latest distributed version of each unique skill
   * that belongs to one of the specified packages.
   * Used to compute removed artifacts only from packages being deployed.
   * TODO: Implement when skill-package relationship and distribution tracking is ready
   */
  findActiveSkillVersionsByTargetAndPackages?(
    organizationId: OrganizationId,
    targetId: TargetId,
    packageIds: PackageId[],
  ): Promise<SkillVersion[]>;

  /**
   * Get all currently active (not removed) package IDs for a specific target.
   * This looks at the latest distribution operation for each package
   * and returns packages where the latest operation is NOT 'remove'.
   * Used to detect which packages have been removed during a new distribution.
   */
  findActivePackageIdsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<PackageId[]>;
}
