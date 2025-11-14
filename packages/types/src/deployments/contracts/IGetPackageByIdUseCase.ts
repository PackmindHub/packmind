import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { Package } from '../Package';
import { PackageId } from '../Package';
import { SpaceId } from '../../spaces/SpaceId';

export type GetPackageByIdCommand = PackmindCommand & {
  packageId: PackageId;
  organizationId: OrganizationId;
  spaceId: SpaceId;
};

export type GetPackageByIdResponse = {
  package: Package;
};

export type IGetPackageByIdUseCase = IUseCase<
  GetPackageByIdCommand,
  GetPackageByIdResponse
>;
