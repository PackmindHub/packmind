import { DeploymentsError } from './DeploymentsError';

/**
 * The artifact id in the request is not a UUID.
 *
 * Malformed on its face, independently of any stored state, so
 * `invalid_input`. The id is named back because the caller supplied it.
 */
export class InvalidArtifactIdError extends DeploymentsError {
  constructor(public readonly invalidId: string) {
    super(
      'invalid_input',
      'invalid_artifact_id',
      { artefactId: invalidId },
      `Invalid artifact id: "${invalidId}" is not a valid UUID.`,
    );
    this.name = 'InvalidArtifactIdError';
  }
}
