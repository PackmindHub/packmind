import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { PackageId } from '../Package';
import { PackageRelease } from '../PackageRelease';
import { SpaceId } from '../../spaces/SpaceId';

export type CreatePackageReleaseCommand = PackmindCommand & {
  packageId: PackageId;
  organizationId: OrganizationId;
  spaceId: SpaceId;
  version: string;
};

export type CreatePackageReleaseResponse = {
  release: PackageRelease;
};

export type ICreatePackageReleaseUseCase = IUseCase<
  CreatePackageReleaseCommand,
  CreatePackageReleaseResponse
>;
