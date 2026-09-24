import { SpacesInternalError } from './SpacesInternalError';

/**
 * No default space exists for an organization.
 *
 * Every organization is supposed to have a default space; missing one is
 * our broken invariant, not the caller's fault. This is an internal error.
 */
export class DefaultSpaceNotFoundError extends SpacesInternalError {
  constructor(organizationId: string) {
    super(
      'default_space_missing',
      { organizationId },
      `No default space found for organization ${organizationId}`,
    );
    this.name = 'DefaultSpaceNotFoundError';
  }
}
