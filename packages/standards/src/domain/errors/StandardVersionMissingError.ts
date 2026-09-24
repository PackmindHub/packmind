import { StandardsInternalError } from './StandardsInternalError';

/**
 * An existing standard has no version at all.
 *
 * A broken invariant: every standard is created together with its first
 * version, so one with none reached this state through a bug, not a caller
 * mistake.
 */
export class StandardVersionMissingError extends StandardsInternalError {
  constructor(standardId: string) {
    super(
      'standard_version_missing',
      { standardId },
      'No standard version found for this standard.',
    );
    this.name = 'StandardVersionMissingError';
  }
}
