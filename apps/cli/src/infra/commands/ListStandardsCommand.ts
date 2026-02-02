import { command } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { listStandardsHandler } from './listStandardsHandler';

export const listStandardsCommand = command({
  name: 'list',
  description: 'List available coding standards',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await listStandardsHandler({
      packmindCliHexa,
      exit: process.exit,
      log: console.log,
      error: console.error,
    });
  },
});
