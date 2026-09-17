import { DistributionHistoryEntry } from '../DistributionHistoryEntry';
import { IUseCase, SpaceMemberCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { PackageId } from '../Package';

/**
 * Carries the space because a package belongs to one, and reading its history
 * is the same read as reading the package: `GetPackageByIdCommand` is space
 * scoped for exactly this reason.
 */
export type ListDeploymentsByPackageCommand = SpaceMemberCommand & {
  packageId: PackageId;
  organizationId: OrganizationId;
};

export type IListDeploymentsByPackage = IUseCase<
  ListDeploymentsByPackageCommand,
  DistributionHistoryEntry[]
>;
