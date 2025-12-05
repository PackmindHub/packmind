import {
  Distribution,
  DistributionId,
  DistributionStatus,
  OrganizationId,
  PackageId,
  RecipeId,
  RecipeVersion,
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
}
