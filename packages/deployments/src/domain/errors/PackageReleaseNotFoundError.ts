export class PackageReleaseNotFoundError extends Error {
  constructor(packageId: string, version: string) {
    super(`Package ${packageId} has no release ${version}`);
    this.name = 'PackageReleaseNotFoundError';
  }
}
