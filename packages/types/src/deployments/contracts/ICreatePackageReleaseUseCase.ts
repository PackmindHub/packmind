import { IUseCase, SpaceMemberCommand } from '../../UseCase';
import { PackageId } from '../Package';
import { PackageReleaseContent } from '../PackageRelease';

export type CreatePackageReleaseCommand = SpaceMemberCommand & {
  packageId: PackageId;
  version: string;
};

export type CreatePackageReleaseResponse = {
  release: PackageReleaseContent;
};

export type ICreatePackageReleaseUseCase = IUseCase<
  CreatePackageReleaseCommand,
  CreatePackageReleaseResponse
>;
