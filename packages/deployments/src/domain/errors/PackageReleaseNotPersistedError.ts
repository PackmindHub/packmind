import { DeploymentsInternalError } from './DeploymentsInternalError';

/**
 * The write reported success and the read straight after it found nothing.
 *
 * A broken invariant rather than a refusal: the transaction committed, so
 * there is no user decision to report and nothing the caller can retry into a
 * different answer. It is named so that a log or a catch can tell it apart
 * from `PackageReleaseNotFoundError`, which is the ordinary answer to asking
 * for a version that was never cut.
 */
export class PackageReleaseNotPersistedError extends DeploymentsInternalError {
  constructor(
    readonly packageId: string,
    readonly version: string,
  ) {
    super(
      'package_release_not_persisted',
      { packageId, version },
      `Package release ${version} of package ${packageId} could not be read back after being written`,
    );
    this.name = 'PackageReleaseNotPersistedError';
  }
}
