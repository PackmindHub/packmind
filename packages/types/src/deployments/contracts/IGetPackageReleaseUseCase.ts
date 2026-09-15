import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { PackageId } from '../Package';
import { PackageRelease } from '../PackageRelease';
import { SpaceId } from '../../spaces/SpaceId';

export type GetPackageReleaseCommand = PackmindCommand & {
  packageId: PackageId;
  organizationId: OrganizationId;
  spaceId: SpaceId;
  version: string;
};

export type GetPackageReleaseResponse = {
  release: PackageRelease;
};

export type IGetPackageReleaseUseCase = IUseCase<
  GetPackageReleaseCommand,
  GetPackageReleaseResponse
>;
