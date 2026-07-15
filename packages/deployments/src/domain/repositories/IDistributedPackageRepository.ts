import {
  DistributedPackage,
  DistributedPackageId,
  DistributionId,
  IRepository,
  PackageId,
  CommandVersionId,
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

  addCommandVersions(
    distributedPackageId: DistributedPackageId,
    recipeVersionIds: CommandVersionId[],
  ): Promise<void>;

  addSkillVersions(
    distributedPackageId: DistributedPackageId,
    skillVersionIds: SkillVersionId[],
  ): Promise<void>;
}
