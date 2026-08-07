import { command, flag, number, option, optional, string } from 'cmd-ts';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { createGitProviderId } from '@packmind/types';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { listGitReposHandler } from './git/listGitReposHandler';

export const listGitReposCommand = command({
  name: 'list',
  description: 'List repositories managed under a git connection',
  args: {
    connectionId: option({
      type: string,
      long: 'connectionId',
      description: 'ID of the git connection (provider) to list repos for',
    }),
    showAvailable: flag({
      long: 'show-available',
      description:
        'List repositories that can be managed instead of the ones already managed',
    }),
    page: option({
      type: optional(number),
      long: 'page',
      description:
        'Page of available repositories to fetch (only with --show-available)',
    }),
  },
  handler: async ({ connectionId, showAvailable, page }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await listGitReposHandler({
      packmindCliHexa,
      connectionId: createGitProviderId(connectionId),
      showAvailable,
      page,
      exit: process.exit,
    });
  },
});
