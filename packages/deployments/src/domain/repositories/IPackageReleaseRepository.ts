import {
  CommandVersionId,
  IRepository,
  PackageId,
  PackageRelease,
  PackageReleaseDetail,
  PackageReleaseEntry,
  SkillVersionId,
  StandardVersionId,
} from '@packmind/types';

/**
 * Version ids a release pins, as the write surface speaks them.
 *
 * The aggregate itself holds hydrated version entities; only writes take ids.
 */
export type PackageReleaseVersionIds = {
  recipeVersionIds: CommandVersionId[];
  standardVersionIds: StandardVersionId[];
  skillVersionIds: SkillVersionId[];
};

export interface IPackageReleaseRepository extends IRepository<PackageRelease> {
  /**
   * Writes the release row and all three sets of join rows in one transaction,
   * or writes nothing.
   *
   * A second release of the same version for the same package hits the unique
   * index and the violation propagates: turning it into a refusal is the
   * caller's business, not this repository's.
   */
  createWithVersions(
    release: PackageReleaseEntry,
    versions: PackageReleaseVersionIds,
  ): Promise<PackageReleaseEntry>;

  /**
   * Deliberately unordered: `0.10.0` sorts below `0.9.0` as a string, so
   * ordering is the caller's job once versions are parsed.
   */
  findByPackageId(packageId: PackageId): Promise<PackageReleaseEntry[]>;

  findByPackageIdAndVersion(
    packageId: PackageId,
    version: string,
  ): Promise<PackageReleaseDetail | null>;

  /**
   * The release with its full component versions, soft-deleted ones
   * included, as needed to render it.
   */
  findContentByPackageIdAndVersion(
    packageId: PackageId,
    version: string,
  ): Promise<PackageRelease | null>;
}
