import { DeploymentsError } from './DeploymentsError';

/**
 * The package does not exist, or it is not in the space it was addressed
 * through.
 *
 * The message is the same either way, and does not name the space: a member of
 * one space must not learn that a package id is real by being told it lives
 * somewhere else. `spaceId` is the scope the lookup was made in, and is kept
 * for the log.
 */
export class PackageNotFoundError extends DeploymentsError {
  constructor(packageId: string, spaceId?: string) {
    super(
      'not_found',
      'package_not_found',
      { packageId, ...(spaceId ? { spaceId } : {}) },
      `Package with id "${packageId}" was not found`,
    );
    this.name = 'PackageNotFoundError';
  }
}
