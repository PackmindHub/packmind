import {
  DistributionStatus,
  IRepository,
  OrganizationId,
  PackageId,
  Package,
  PackagesDeployment,
  TargetId,
} from '@packmind/types';

export interface IPackagesDeploymentRepository
  extends IRepository<PackagesDeployment> {
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
   * Get all currently deployed packages for a specific target.
   * This returns the latest deployed version of each unique package.
   * Used to generate complete package deployments that include all deployed packages.
   */
  findActivePackagesByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<Package[]>;
}
