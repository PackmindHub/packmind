import { command, option, optional, positional, string } from 'cmd-ts';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { createGitProviderId } from '@packmind/types';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { addGitRepoHandler } from './git/addGitRepoHandler';

export const addGitRepoCommand = command({
  name: 'add',
  description: 'Manage a repository under a git connection',
  args: {
    repository: positional({
      type: string,
      displayName: 'owner/repo',
      description:
        'Repository to manage, in owner/repo form (e.g. myOrga/myRepo)',
    }),
    connectionId: option({
      type: string,
      long: 'connectionId',
      description: 'ID of the git connection (provider) that owns the repo',
    }),
    branch: option({
      type: optional(string),
      long: 'branch',
      description:
        'Branch to track (defaults to the repository default branch when omitted)',
    }),
  },
  handler: async ({ repository, connectionId, branch }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await addGitRepoHandler({
      packmindCliHexa,
      connectionId: createGitProviderId(connectionId),
      repository,
      branch,
      exit: process.exit,
    });
  },
});
