import { subcommands } from 'cmd-ts';
import { listGitConnectionsCommand } from './ListGitConnectionsCommand';

export const gitConnectionCommand = subcommands({
  name: 'connection',
  description: 'Manage git connections (providers) in your organization',
  cmds: {
    list: listGitConnectionsCommand,
  },
});
