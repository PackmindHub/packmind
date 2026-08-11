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
        'Move the tracked branch to the current branch (requires an existing tracked branch)',
    }),
    branch: option({
      type: optional(string),
      long: 'branch',
      description:
        'Branch to track (defaults to the branch currently checked out)',
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
