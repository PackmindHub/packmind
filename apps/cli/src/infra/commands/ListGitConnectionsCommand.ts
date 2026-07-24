import { command } from 'cmd-ts';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { listGitConnectionsHandler } from './git/listGitConnectionsHandler';

export const listGitConnectionsCommand = command({
  name: 'list',
  description: 'List git connections available in the organization',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await listGitConnectionsHandler({
      packmindCliHexa,
      exit: process.exit,
    });
  },
});
