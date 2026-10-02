import { ArtifactType, IPublicUseCase } from '@packmind/types';

export type ICheckUpgradesCommand = {
  /** The directory holding the packmind.json to check. */
  baseDirectory: string;
  /** The running CLI version, sent in the lock file as a real install would. */
  cliVersion: string;
};

export type CheckUpgradesArtifactChange = {
  type: ArtifactType;
  /** The artifact slug, as it appears in the lock file key. */
  name: string;
  change: 'added' | 'updated' | 'removed';
  /** The version the repo has today; absent for an added artifact. */
  fromVersion?: number;
  /** The version an upgrade would install; absent for a removed artifact. */
  toVersion?: number;
};

export type CheckUpgradesPackage = {
  /** Normalized `@space/package` slug. */
  slug: string;
  /** What packmind.json records: an exact `X.Y.Z` or `*`. */
  from: string;
  /**
   * The release an upgrade would move an exact pin to, which equals `from`
   * when the package is already on its newest release. Null for a package
   * tracking `*`, which never moves.
   */
  to: string | null;
  artifacts: CheckUpgradesArtifactChange[];
};

export type ICheckUpgradesResult = {
  hasUpgrades: boolean;
  packages: CheckUpgradesPackage[];
  /**
   * Changes to artifacts that cannot be traced back to any package of
   * packmind.json, e.g. leftovers of a package the file no longer lists.
   */
  unattributedArtifacts: CheckUpgradesArtifactChange[];
  missingAccess: string[];
};

/**
 * Computes what `packmind install --upgrade` would change in a directory,
 * without writing anything locally nor recording anything on the server.
 *
 * @throws PackmindConfigNotFoundError when the directory has no packmind.json
 * @throws PackmindConfigInvalidError when packmind.json cannot be parsed
 */
export type ICheckUpgradesUseCase = IPublicUseCase<
  ICheckUpgradesCommand,
  ICheckUpgradesResult
>;
