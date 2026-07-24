import { command, option, optional, positional, string } from 'cmd-ts';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { addGitConnectionHandler } from './git/addGitConnectionHandler';
import { GitProviderType } from './customParameters/GitProviderType';

export const addGitConnectionCommand = command({
  name: 'add',
  description: 'Add a git connection (provider) to the organization',
  args: {
    token: positional({
      type: string,
      displayName: 'token',
      description: 'Access token used to authenticate against the provider',
    }),
    displayName: option({
      type: string,
      long: 'displayName',
      description: 'Human-readable name for the connection',
    }),
    type: option({
      type: GitProviderType,
      long: 'type',
      description: 'Provider type: github or gitlab',
    }),
    url: option({
      type: optional(string),
      long: 'url',
      description:
        'Base URL of the provider (required for self-hosted instances, e.g. https://gitlab.example.com)',
    }),
  },
  handler: async ({ token, displayName, type, url }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await addGitConnectionHandler({
      packmindCliHexa,
      input: {
        source: type,
        displayName,
        token,
        url: url ?? null,
      },
      exit: process.exit,
    });
  },
});
