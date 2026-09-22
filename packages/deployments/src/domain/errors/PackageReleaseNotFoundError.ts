import { DeploymentsError } from './DeploymentsError';

/**
 * The package exists, but no release was ever cut at that version.
 *
 * The ordinary answer to asking for a version that is not there — told apart
 * from `PackageReleaseNotPersistedError`, which is the broken invariant of a
 * release that was written and then could not be read back.
 */
export class PackageReleaseNotFoundError extends DeploymentsError {
  constructor(packageId: string, version: string) {
    super(
      'not_found',
      'package_release_not_found',
      { packageId, version },
      `Package ${packageId} has no release ${version}`,
    );
    this.name = 'PackageReleaseNotFoundError';
  }
}
