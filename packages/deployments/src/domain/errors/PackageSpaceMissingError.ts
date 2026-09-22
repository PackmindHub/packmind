import { DeploymentsInternalError } from './DeploymentsInternalError';

/**
 * A stored package points at a space that no longer resolves.
 *
 * Not a domain error: the caller asked for a package that exists, and nothing
 * it could send would make the dangling reference resolve. Either the space
 * was deleted without its packages, or the two stores disagree — both are
 * ours to fix, so it keeps the 500 and the stack.
 */
export class PackageSpaceMissingError extends DeploymentsInternalError {
  constructor(packageId: string, spaceId: string) {
    super(
      'package_space_missing',
      { packageId, spaceId },
      `Package ${packageId} references space ${spaceId}, which does not resolve`,
    );
    this.name = 'PackageSpaceMissingError';
  }
}
