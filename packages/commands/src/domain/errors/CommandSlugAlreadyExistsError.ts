import { CommandsError } from './CommandsError';

/**
 * A command with this slug already exists in the space.
 *
 * The slug is what the caller typed, so it stays in the message to tell them
 * what to change; the space id goes to the context, where only the log sees
 * it.
 */
export class CommandSlugAlreadyExistsError extends CommandsError {
  constructor(
    public readonly slug: string,
    public readonly spaceId: string,
  ) {
    super(
      'conflict',
      'command_slug_already_exists',
      { commandSlug: slug, spaceId },
      `A command with slug "${slug}" already exists in this space`,
    );
    this.name = 'CommandSlugAlreadyExistsError';
  }
}
