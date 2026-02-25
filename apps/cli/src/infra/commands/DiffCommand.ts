import { command, flag } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { diffArtefactsHandler } from './diffArtefactsHandler';

export const diffCommand = command({
  name: 'diff',
  description:
    'Show differences between local command files and server content',
  args: {
    submit: flag({
      long: 'submit',
      description: 'Submit detected changes as change proposals',
    }),
    includeSubmitted: flag({
      long: 'include-submitted',
      description: 'Include already submitted changes in the output',
    }),
  },
  handler: async ({ submit, includeSubmitted }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await diffArtefactsHandler({
      packmindCliHexa,
      exit: process.exit,
      getCwd: () => process.cwd(),
      log: console.log,
      error: console.error,
      submit,
      includeSubmitted,
    });
  },
});
