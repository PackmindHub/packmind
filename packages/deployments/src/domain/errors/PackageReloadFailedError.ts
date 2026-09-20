import { PackmindInternalError } from '@packmind/types';

/**
 * The package could not be read back after its artefacts were written.
 *
 * Not a domain error: the caller did nothing wrong and can do nothing about
 * it. The write has already landed, so this is a broken invariant — it earns
 * the 500, the stack and the `error` level, and its message stays out of the
 * response.
 */
export class PackageReloadFailedError extends PackmindInternalError {
  constructor(packageId: string) {
    super(
      'package_reload_failed',
      { packageId },
      `Package ${packageId} could not be read back after its artefacts were written.`,
    );
    this.name = 'PackageReloadFailedError';
    Object.setPrototypeOf(this, PackageReloadFailedError.prototype);
  }
}
