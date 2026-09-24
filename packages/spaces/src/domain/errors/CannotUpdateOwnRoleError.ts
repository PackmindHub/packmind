import { SpacesError } from './SpacesError';

/**
 * A user cannot update their own role.
 *
 * The user and space ids go to the context, where only the log sees them.
 */
export class CannotUpdateOwnRoleError extends SpacesError {
  constructor(userId: string, spaceId: string) {
    super(
      'invalid_input',
      'cannot_update_own_role',
      { userId, spaceId },
      'You cannot update your own role.',
    );
    this.name = 'CannotUpdateOwnRoleError';
  }
}
