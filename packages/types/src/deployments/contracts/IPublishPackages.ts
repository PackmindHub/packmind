import { IUseCase, PackmindCommand } from '../../UseCase';
import { TargetId } from '../TargetId';
import { PackagesDeployment } from '../PackagesDeployment';
import { PackageId } from '../Package';

export type PublishPackagesCommand = PackmindCommand & {
  targetIds: TargetId[];
  packageIds: PackageId[];
  /**
   * Which version of each package to distribute, keyed by package id: an exact
   * `X.Y.Z` to send that release, or `*` / absent to send the live package.
   *
   * What lands in the repo's `packmind.json` is this same spec, so the repo
   * stays where it was put until someone moves it.
   */
  packageVersions?: Record<string, string>;
};

export type IPublishPackages = IUseCase<
  PublishPackagesCommand,
  PackagesDeployment[]
>;
