/**
 * Snapshot of the current version numbers of every artifact in a package at
 * the moment a plugin was published to a marketplace. Keyed by artifact id so
 * additions/removals are detected too.
 *
 * All three artifact kinds are recorded, standards included: the fingerprint
 * states what the source package held at publish time. Only a subset of it
 * decides whether a plugin has drifted — see {@link pluginContentEqual}.
 */
export type VersionFingerprint = {
  recipes: Record<string, number>;
  standards: Record<string, number>;
  skills: Record<string, number>;
};

/**
 * Whether two fingerprints describe the same *plugin* content.
 *
 * Only the artifacts a plugin actually carries are compared — commands and
 * skills. A plugin never ships a standard (`ClaudePluginDeployer.deployStandards`
 * renders no file), so editing one changes the package, and therefore its
 * fingerprint, without changing a single byte of what the marketplace serves.
 * Counting standards here would flag the plugin as outdated and offer a publish
 * whose pull request carries no file change at all.
 *
 * Returns `false` when either side is absent (e.g. a distribution published
 * before fingerprints existed) so such rows are treated as "cannot determine"
 * by the caller, never outdated.
 */
export function pluginContentEqual(
  a: VersionFingerprint | undefined,
  b: VersionFingerprint | undefined,
): boolean {
  if (!a || !b) {
    return false;
  }
  return sameMap(a.recipes, b.recipes) && sameMap(a.skills, b.skills);
}

function sameMap(
  x: Record<string, number>,
  y: Record<string, number>,
): boolean {
  const xk = Object.keys(x).sort();
  const yk = Object.keys(y).sort();
  if (xk.length !== yk.length) return false;
  return xk.every((k, i) => k === yk[i] && x[k] === y[k]);
}
