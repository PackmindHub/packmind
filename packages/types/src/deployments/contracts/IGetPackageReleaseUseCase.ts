import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { PackageId } from '../Package';
import { PackageReleaseContent } from '../PackageRelease';
import { SpaceId } from '../../spaces/SpaceId';

export type GetPackageReleaseCommand = PackmindCommand & {
  packageId: PackageId;
  organizationId: OrganizationId;
  spaceId: SpaceId;
  version: string;
};

export type GetPackageReleaseResponse = {
  release: PackageReleaseContent;
};

export type IGetPackageReleaseUseCase = IUseCase<
  GetPackageReleaseCommand,
  GetPackageReleaseResponse
>;
