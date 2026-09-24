import { SpaceId } from '@packmind/types';
import { SpacesError } from './SpacesError';

/**
 * The space does not exist, or it belongs to another organization.
 *
 * One error for both, with one message, on purpose: a caller outside the
 * organization must not be able to tell a space that is not theirs from one
 * that was never there. The space id or slug that was asked for is kept in the
 * context, where only the log sees it.
 */
export class SpaceNotFoundError extends SpacesError {
  constructor(spaceIdOrSlug: SpaceId | string) {
    super(
      'not_found',
      'space_not_found',
      { spaceIdOrSlug: String(spaceIdOrSlug) },
      'This space does not exist, or you do not have access to it.',
    );
    this.name = 'SpaceNotFoundError';
  }
}
