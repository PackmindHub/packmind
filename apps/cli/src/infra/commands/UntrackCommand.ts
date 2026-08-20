import { command } from 'cmd-ts';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { removedUntrackHandler } from './removedCommandHandler';

export const untrackCommand = command({
  name: 'untrack',
  description: '[Removed] Use "git untrack" instead',
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
