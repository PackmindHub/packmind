import { IUseCase, SpaceMemberCommand } from '../../UseCase';
import { PackageId } from '../Package';
import { PackageReleaseReceipt } from '../PackageRelease';

export type CreatePackageReleaseCommand = SpaceMemberCommand & {
  packageId: PackageId;
  version: string;
};

export type CreatePackageReleaseResponse = {
  release: PackageReleaseReceipt;
};

export type ICreatePackageReleaseUseCase = IUseCase<
  CreatePackageReleaseCommand,
  CreatePackageReleaseResponse
>;
