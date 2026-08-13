import { command } from 'cmd-ts';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { removedUntrackHandler } from './removedCommandHandler';

export const untrackCommand = command({
  name: 'untrack',
  description:
    "[Deprecated] Remove Packmind's tracking of the current repository (keeps every recorded distribution)",
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    removedUntrackHandler({
      notifyError: packmindCliHexa.output.notifyError.bind(
        packmindCliHexa.output,
      ),
    });
  },
});
