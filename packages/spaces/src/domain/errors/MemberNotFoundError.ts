import { SpacesError } from './SpacesError';

/**
 * The user is not a member of the space.
 *
 * The user and space ids go to the context, where only the log sees them.
 */
export class MemberNotFoundError extends SpacesError {
  constructor(userId: string, spaceId: string) {
    super(
      'not_found',
      'space_member_not_found',
      { userId, spaceId },
      'This member does not exist in this space, or you do not have access to it.',
    );
    this.name = 'MemberNotFoundError';
  }
}
