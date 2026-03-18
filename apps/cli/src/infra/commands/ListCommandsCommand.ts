import { command, option, optional, string } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  listCommandsHandler,
  ListCommandsHandlerDependencies,
} from './commands/listCommandsHandler';

export const listCommandsCommand = command({
  name: 'list',
  description: 'List available commands',
  args: {
    space: option({
      type: optional(string),
      long: 'space',
      description: 'Filter commands by space slug',
    }),
  },
  handler: async ({ space }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    const deps: ListCommandsHandlerDependencies = {
      packmindCliHexa,
      exit: process.exit,
    };

    await listCommandsHandler({ space }, deps);
  },
});
