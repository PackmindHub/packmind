import { IUseCase, SpaceMemberCommand } from '../../UseCase';
import { PackageId } from '../Package';
import {
  PackageReleaseReadiness,
  PackageReleaseSummary,
} from '../PackageRelease';

export type ListPackageReleasesCommand = SpaceMemberCommand & {
  packageId: PackageId;
};

export type ListPackageReleasesResponse = {
  releases: PackageReleaseSummary[];
  readiness: PackageReleaseReadiness;
};

export type IListPackageReleasesUseCase = IUseCase<
  ListPackageReleasesCommand,
  ListPackageReleasesResponse
>;
