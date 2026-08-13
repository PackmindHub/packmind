import { command, flag, option, optional, string } from 'cmd-ts';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { removedTrackHandler } from './removedCommandHandler';

export const trackCommand = command({
  name: 'track',
  // Listed in --help on purpose: a stub nobody can discover cannot redirect
  // anyone. "[Removed]" matches what running it actually says.
  description: '[Removed] Use "git track" instead',
  args: {
    update: flag({
      long: 'update',
      description:
        'Move the tracked branch to the current branch (requires an existing tracked branch)',
    }),
    branch: option({
      type: optional(string),
      long: 'branch',
      description:
        'Branch to track (defaults to the branch currently checked out)',
    }),
    // Accepted only so the old removal syntax gets the migration message
    // instead of a raw "unknown arguments" parser error.
    remove: flag({
      long: 'remove',
      description: 'Removal now lives in the "git untrack" command',
    }),
  },
  handler: async ({ update, branch, remove }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    removedTrackHandler({
      update,
      branch,
      remove,
      notifyError: packmindCliHexa.output.notifyError.bind(
        packmindCliHexa.output,
      ),
    });
  },
});
