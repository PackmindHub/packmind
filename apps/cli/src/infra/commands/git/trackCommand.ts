import { command, flag, option, optional, string } from 'cmd-ts';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { trackHandler } from '../trackHandler';

export const trackCommand = command({
  name: 'track',
  description:
    'Set the repository and branch Packmind tracks for the current project',
  args: {
    update: flag({
      long: 'update',
      description:
        'Move the tracked branch to the checked-out branch, or to --branch when it is given (requires an existing tracked branch)',
    }),
    branch: option({
      type: optional(string),
      long: 'branch',
      description:
        'Branch to track instead of the checked-out one; combines with --update to move tracking to it',
    }),
  },
  handler: async ({ update, branch }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await trackHandler({
      update,
      branch,
      baseDirectory: process.cwd(),
      trackRepository: packmindCliHexa.trackRepository.bind(packmindCliHexa),
    });
  },
});
