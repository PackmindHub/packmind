/**
 * Snapshot of the current version numbers of every artifact in a package at
 * the moment a plugin was published to a marketplace. Keyed by artifact id so
 * additions/removals are detected too. Compared against the package's current
 * fingerprint on reconcile to flag a marketplace as "outdated".
 */
export type VersionFingerprint = {
  recipes: Record<string, number>;
  standards: Record<string, number>;
  skills: Record<string, number>;
};

/**
 * Stable equality between two fingerprints. Returns `false` when either side
 * is absent (e.g. a distribution published before fingerprints existed) so
 * such rows are treated as "cannot determine" by the caller, never outdated.
 */
export function versionFingerprintsEqual(
  a: VersionFingerprint | undefined,
  b: VersionFingerprint | undefined,
): boolean {
  if (!a || !b) {
    return false;
  }
  const sameMap = (x: Record<string, number>, y: Record<string, number>) => {
    const xk = Object.keys(x).sort();
    const yk = Object.keys(y).sort();
    if (xk.length !== yk.length) return false;
    return xk.every((k, i) => k === yk[i] && x[k] === y[k]);
  };
  return (
    sameMap(a.recipes, b.recipes) &&
    sameMap(a.standards, b.standards) &&
    sameMap(a.skills, b.skills)
  );
}
