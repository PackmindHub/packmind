import { command } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { listCommandsHandler } from './listCommandsHandler';

export const listCommandsCommand = command({
  name: 'list',
  description: 'List available commands',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await listCommandsHandler({
      packmindCliHexa,
      exit: process.exit,
      log: console.log,
      error: console.error,
    });
  },
});
