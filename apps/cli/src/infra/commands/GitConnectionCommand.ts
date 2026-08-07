import { subcommands } from 'cmd-ts';
import { listGitConnectionsCommand } from './ListGitConnectionsCommand';
import { addGitConnectionCommand } from './AddGitConnectionCommand';

export const gitConnectionCommand = subcommands({
  name: 'connection',
  description: 'Manage git connections (providers) in your organization',
  cmds: {
    list: listGitConnectionsCommand,
    add: addGitConnectionCommand,
  },
});
