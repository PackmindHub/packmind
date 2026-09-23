import { CommandsError } from './CommandsError';

/**
 * The command does not exist, or it belongs to another space than the one
 * asked for.
 *
 * One error for both, with one message, on purpose: a caller must not be
 * able to tell a command outside their space from one that was never there.
 * The space id that was asked for is kept in the context, where only the log
 * sees it.
 */
export class CommandNotFoundError extends CommandsError {
  constructor(commandId: string, spaceId?: string) {
    super(
      'not_found',
      'command_not_found',
      { commandId, ...(spaceId ? { spaceId } : {}) },
      'This command does not exist, or you do not have access to it.',
    );
    this.name = 'CommandNotFoundError';
  }
}
