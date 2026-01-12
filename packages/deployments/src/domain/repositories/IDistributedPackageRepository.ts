import {
  DistributedPackage,
  DistributedPackageId,
  DistributionId,
  IRepository,
  PackageId,
  RecipeVersionId,
  SkillVersionId,
  StandardVersionId,
} from '@packmind/types';

export interface IDistributedPackageRepository extends IRepository<DistributedPackage> {
  findByDistributionId(
    distributionId: DistributionId,
  ): Promise<DistributedPackage[]>;

  findByPackageId(packageId: PackageId): Promise<DistributedPackage[]>;

  addStandardVersions(
    distributedPackageId: DistributedPackageId,
    standardVersionIds: StandardVersionId[],
  ): Promise<void>;

  addRecipeVersions(
    distributedPackageId: DistributedPackageId,
    recipeVersionIds: RecipeVersionId[],
  ): Promise<void>;

  addSkillVersions(
    distributedPackageId: DistributedPackageId,
    skillVersionIds: SkillVersionId[],
  ): Promise<void>;
}
