/**
 * A version string that had to be an `X.Y.Z` triple and was not.
 *
 * Thrown only where a *current* version is read back from somewhere that is
 * supposed to have validated it already — persistence, or an API response — so
 * it reports a broken invariant rather than a user's typo. A version a user
 * submitted is refused with a `PackageReleaseRefusal` code instead, and never
 * throws.
 */
export class InvalidPackageReleaseVersionError extends Error {
  constructor(readonly version: string) {
    super(`Not a package release version: ${version}`);
    this.name = 'InvalidPackageReleaseVersionError';
  }
}
