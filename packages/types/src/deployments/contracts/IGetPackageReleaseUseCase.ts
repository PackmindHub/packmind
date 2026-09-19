import { IUseCase, SpaceMemberCommand } from '../../UseCase';
import { PackageId } from '../Package';
import { PackageReleaseContent } from '../PackageRelease';

export type GetPackageReleaseCommand = SpaceMemberCommand & {
  packageId: PackageId;
  version: string;
};

export type GetPackageReleaseResponse = {
  release: PackageReleaseContent;
};

export type IGetPackageReleaseUseCase = IUseCase<
  GetPackageReleaseCommand,
  GetPackageReleaseResponse
>;
