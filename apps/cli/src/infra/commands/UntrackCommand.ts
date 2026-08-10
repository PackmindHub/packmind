import { command } from 'cmd-ts';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { untrackHandler } from './untrackHandler';

export const untrackCommand = command({
  name: 'untrack',
  description:
    "Remove Packmind's tracking of the current repository (keeps every recorded distribution)",
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await untrackHandler({
      baseDirectory: process.cwd(),
      trackRepository: packmindCliHexa.trackRepository.bind(packmindCliHexa),
    });
  },
});
