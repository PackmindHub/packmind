import {
  DistributionStatus,
  IRepository,
  OrganizationId,
  PackageId,
  Package,
  PackagesDeployment,
  TargetId,
} from '@packmind/types';

export interface IPackagesDeploymentRepository extends IRepository<PackagesDeployment> {
  listByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<PackagesDeployment[]>;

  listByPackageId(
    packageId: PackageId,
    organizationId: OrganizationId,
  ): Promise<PackagesDeployment[]>;

  listByTargetIds(
    organizationId: OrganizationId,
    targetIds: TargetId[],
  ): Promise<PackagesDeployment[]>;

  listByOrganizationIdWithStatus(
    organizationId: OrganizationId,
    status?: DistributionStatus,
  ): Promise<PackagesDeployment[]>;

  /**
   * Latest deployed version of each package currently on the target.
   */
  findActivePackagesByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<Package[]>;
}
