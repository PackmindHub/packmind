import { IUseCase, SpaceMemberCommand } from '../../UseCase';
import { PackageId } from '../Package';
import {
  PackageComponentFamily,
  PackageReleaseVerdict,
} from '../PackageRelease';

/** One release, as a list read sees it: the version string and nothing else. */
export type PackageReleaseSummary = {
  version: string;
};

/** A pinned component whose family has a newer version than the release pins. */
export type OutdatedPackageComponent = {
  family: PackageComponentFamily;
  id: string;
  name: string;
  pinnedVersion: number;
  latestVersion: number;
};

export type PackageReleaseReadiness = {
  /** `null` when the package has never been released. */
  currentVersion: string | null;
  verdict: PackageReleaseVerdict;
  /** patch, minor, major — the only three versions the cut will accept. */
  nextVersions: [string, string, string];
  /** Empty, never absent, when nothing is behind. */
  outdatedComponents: OutdatedPackageComponent[];
};

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
