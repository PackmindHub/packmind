import { ComponentFamily } from '../../application/services/packageReleaseResolution';

/**
 * A component of a package has no version at all.
 *
 * The `super()` message is developer-facing; there is no user-visible message
 * for this error, and it is not mapped to an HTTP status.
 */
export class PackageComponentHasNoVersionError extends Error {
  constructor(
    readonly family: ComponentFamily,
    readonly componentId: string,
  ) {
    super(
      `${family.charAt(0).toUpperCase() + family.slice(1)} ${componentId} has no version to pin`,
    );
    this.name = 'PackageComponentHasNoVersionError';
  }
}
