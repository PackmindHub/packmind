import { SpacesError } from './SpacesError';

/**
 * Members cannot be removed from the default space.
 *
 * The space id goes to the context, where only the log sees it.
 */
export class CannotRemoveFromDefaultSpaceError extends SpacesError {
  constructor(spaceId: string) {
    super(
      'invalid_input',
      'cannot_remove_from_default_space',
      { spaceId },
      'Members cannot be removed from the default space.',
    );
    this.name = 'CannotRemoveFromDefaultSpaceError';
  }
}
