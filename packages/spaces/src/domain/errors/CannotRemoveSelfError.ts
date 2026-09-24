import { SpacesError } from './SpacesError';

/**
 * The user cannot remove themselves from a space.
 *
 * The user and space ids go to the context, where only the log sees them.
 */
export class CannotRemoveSelfError extends SpacesError {
  constructor(userId: string, spaceId: string) {
    super(
      'invalid_input',
      'cannot_remove_self',
      { userId, spaceId },
      'You cannot remove yourself from a space.',
    );
    this.name = 'CannotRemoveSelfError';
  }
}
