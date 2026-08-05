import { command, flag } from 'cmd-ts';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { trackHandler } from './trackHandler';

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
    remove: flag({
      long: 'remove',
      description:
        "Remove Packmind's tracking of the current repository (keeps every recorded distribution)",
    }),
  },
  handler: async ({ update, remove }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await trackHandler({
      update,
      remove,
      baseDirectory: process.cwd(),
      trackRepository: packmindCliHexa.trackRepository.bind(packmindCliHexa),
    });
  },
});
