import { subcommands } from 'cmd-ts';
import { gitConnectionCommand } from './GitConnectionCommand';

export const gitCommand = subcommands({
  name: 'git',
  description: 'Manage git connections and repositories',
  cmds: {
    connection: gitConnectionCommand,
  },
});
