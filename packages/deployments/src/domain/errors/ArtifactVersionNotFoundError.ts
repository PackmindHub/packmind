import { DeploymentsError } from '@packmind/types';

/**
 * A command, standard or skill version named in the request does not resolve.
 *
 * Reached when a caller publishes with a version id that has since been
 * superseded or deleted — a stale lockfile is the ordinary way in. The caller
 * can correct it by re-resolving the versions, so it is `not_found` rather
 * than an invariant of ours.
 */
export class ArtifactVersionNotFoundError extends DeploymentsError {
  constructor(
    public readonly artifactLabel: 'Command' | 'Standard' | 'Skill',
    public readonly versionId: string,
  ) {
    super(
      'not_found',
      'artifact_version_not_found',
      { artifactLabel, versionId },
      `${artifactLabel} version with ID ${versionId} not found`,
    );
    this.name = 'ArtifactVersionNotFoundError';
  }
}
