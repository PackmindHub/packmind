import { command, flag, option, optional, string } from 'cmd-ts';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { diffArtefactsHandler } from './diffArtefactsHandler';

export const diffCommand = command({
  name: 'diff',
  description:
    'Show differences between local command files and server content',
  args: {
    includeSubmitted: flag({
      long: 'include-submitted',
      description: 'Include already submitted changes in the output',
    }),
    path: option({
      long: 'path',
      short: 'p',
      description: 'Path to analyze (relative to current directory)',
      type: optional(string),
    }),
  },
  handler: async ({ includeSubmitted, path }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await diffArtefactsHandler({
      packmindCliHexa,
      exit: process.exit,
      getCwd: () => process.cwd(),
      log: console.log,
      includeSubmitted,
      path,
    });
  },
});
