/**
 * Strips the `-next` prerelease suffix from a semver-like CLI version string
 * so it can be compared with `semver.satisfies` / `semver.gt` / `semver.eq`.
 *
 * The Packmind CLI publishes a `-next` prerelease tag between official
 * releases (e.g. `0.28.1-next`); for compatibility/comparison purposes we
 * treat it as the underlying release version (`0.28.1`). The value written
 * to `packmind-lock.json` is kept verbatim — only the comparison is
 * normalized.
 *
 * This helper is the single source of truth for that normalization
 * convention.
 */
export function stripPrerelease(version: string): string {
  return version.replace('-next', '');
}
