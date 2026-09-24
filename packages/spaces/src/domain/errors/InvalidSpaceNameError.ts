import { SpacesError } from './SpacesError';

/**
 * The space name is invalid.
 *
 * The reason is included in the message to tell the caller what to fix.
 */
export class InvalidSpaceNameError extends SpacesError {
  constructor(reason: string) {
    super(
      'invalid_input',
      'invalid_space_name',
      {},
      `Invalid space name: ${reason}`,
    );
    this.name = 'InvalidSpaceNameError';
  }
}
