import {
  PackageVersionSpec,
  formatPackageVersionSpec,
  parsePackageVersionSpec,
} from '@packmind/types';

/**
 * What each slug asks for once `--upgrade` has had its say.
 *
 * A slug the caller leaves out of the map asks the server for the newest
 * release, so releasing a pin is dropping its entry rather than naming a
 * version — the CLI never has to learn what the newest release is, and cannot
 * disagree with the server about it. What comes back is written to
 * `packmind.json`, which is how the upgrade lands in the file.
 *
 * A package tracking `*` keeps its entry: dropping that one would pin a repo
 * that had deliberately chosen not to be pinned.
 */
export function releasePins(
  versions: Record<string, string>,
  upgrade: boolean,
): Record<string, string> {
  if (!upgrade) return versions;

  return Object.fromEntries(
    Object.entries(versions).filter(
      ([, raw]) => parsePackageVersionSpec(raw)?.kind !== 'exact',
    ),
  );
}

export type ExplicitInstallPackage = {
  /** Already normalized to `@space/package`. */
  slug: string;
  versionSpec?: PackageVersionSpec;
};

export type ResolveInstallPackageVersionsParams = {
  /** packmind.json's packages, normalized to `@space/package`, in file order. */
  configSlugs: string[];
  /** The version each normalized config slug records. */
  configVersions: Record<string, string>;
  /** Packages named on the command line, when any were. */
  explicitPackages?: ExplicitInstallPackage[];
  upgrade: boolean;
};

export type ResolvedInstallPackageVersions = {
  packagesSlugs: string[];
  /**
   * What each slug asks for, keyed the same way `packagesSlugs` is.
   *
   * A slug that is deliberately absent asks for the newest release: that is
   * how `install @space/ops` on a package the repo has never carried lands
   * on a version rather than following the package. A slug already in
   * packmind.json keeps what the file says unless a version is typed for it
   * on the command line — the repo's own pin is not something a bare install
   * gets to move.
   */
  packageVersions: Record<string, string>;
};

export function resolveInstallPackageVersions({
  configSlugs,
  configVersions,
  explicitPackages,
  upgrade,
}: ResolveInstallPackageVersionsParams): ResolvedInstallPackageVersions {
  const packageVersions: Record<string, string> = {
    ...releasePins(configVersions, upgrade),
  };

  if (!explicitPackages || explicitPackages.length === 0) {
    return { packagesSlugs: configSlugs, packageVersions };
  }

  for (const pkg of explicitPackages) {
    if (pkg.versionSpec) {
      packageVersions[pkg.slug] = formatPackageVersionSpec(pkg.versionSpec);
    }
  }

  return {
    packagesSlugs: [
      ...new Set([...configSlugs, ...explicitPackages.map((p) => p.slug)]),
    ],
    packageVersions,
  };
}
