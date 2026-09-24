import { SpacesError } from './SpacesError';

/**
 * A space with this name already exists in the organization.
 *
 * The space name is what the caller typed, so it stays in the message to tell
 * them what to change; the organization id goes to the context, where only the
 * log sees it.
 */
export class SpaceSlugConflictError extends SpacesError {
  constructor(spaceName: string, organizationId: string) {
    super(
      'conflict',
      'space_slug_conflict',
      { spaceName, organizationId },
      `A space named "${spaceName}" already exists in this organization.`,
    );
    this.name = 'SpaceSlugConflictError';
  }
}
