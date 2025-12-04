import {
  Distribution,
  DistributionId,
  DistributionStatus,
  OrganizationId,
  PackageId,
  RecipeId,
  StandardId,
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
}
