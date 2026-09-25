import { DeploymentsError } from '@packmind/types';

/**
 * A repo asked for a version of a package that was never released.
 *
 * The listing is part of the message rather than a field on the side because
 * the CLI shows the server's message verbatim: a developer who typed `0.2.0`
 * into `packmind.json` needs to be told, in the same breath, which versions
 * they could have typed instead. Ordered newest first, unannounced — the one
 * they most likely want is the one they read first, and saying so in the
 * sentence spends a clause on something the list already shows.
 */
export class PackageVersionNotAvailableError extends DeploymentsError {
  constructor(
    public readonly packageSlug: string,
    public readonly requestedVersion: string,
    public readonly availableVersions: string[],
  ) {
    super(
      'not_found',
      'package_release_not_found',
      { packageSlug, version: requestedVersion },
      availableVersions.length > 0
        ? `Package ${packageSlug} has no version ${requestedVersion}. Available versions: ${availableVersions.join(', ')}`
        : `Package ${packageSlug} has no version ${requestedVersion}. It has never been released — use "*" to track its current state.`,
    );
    this.name = 'PackageVersionNotAvailableError';
  }
}
