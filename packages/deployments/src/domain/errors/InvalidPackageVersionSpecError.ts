import { DeploymentsError, WILDCARD_VERSION_SPEC } from '@packmind/types';

/**
 * A `packmind.json` entry — or a version typed on the command line — that is
 * neither the wildcard nor an exact `X.Y.Z`.
 *
 * Refused rather than read as the wildcard, because the specs people reach for
 * and do not get are ranges: a `^0.1.0` quietly treated as "track the live
 * package" would hand the repo the drift it was written to stop, and say
 * nothing.
 */
export class InvalidPackageVersionSpecError extends DeploymentsError {
  constructor(
    public readonly packageSlug: string,
    public readonly spec: string,
  ) {
    super(
      'invalid_input',
      'invalid_package_version_spec',
      { packageSlug, version: spec },
      `"${spec}" is not a valid version for ${packageSlug}. Use an exact version like 1.2.3, or "${WILDCARD_VERSION_SPEC}" to track the package as it stands (version ranges are not supported).`,
    );
    this.name = 'InvalidPackageVersionSpecError';
  }
}
