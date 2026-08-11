import { command } from 'cmd-ts';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PackmindCliHexa } from '../../PackmindCliHexa';

export const untrackCommand = command({
  name: 'untrack',
  description:
    "[Deprecated] Remove Packmind's tracking of the current repository (keeps every recorded distribution)",
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    packmindCliHexa.output.notifyError(
      'Command "packmind untrack" has been removed.',
      {
        content: 'Use the "git untrack" command instead:',
        exampleCommand: 'packmind git untrack',
      },
    );
    process.exit(1);
  },
});
