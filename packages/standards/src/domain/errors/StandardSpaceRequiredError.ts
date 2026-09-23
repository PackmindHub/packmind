import { StandardsError } from './StandardsError';

/**
 * A standard was asked to be created without the space it belongs to.
 *
 * The port accepts a null space, but no standard can live outside one, so the
 * caller must name it; the organization it was asked for goes in the context.
 */
export class StandardSpaceRequiredError extends StandardsError {
  constructor(organizationId: string) {
    super(
      'invalid_input',
      'space_required',
      { organizationId },
      'A space is required to create a standard.',
    );
    this.name = 'StandardSpaceRequiredError';
  }
}
