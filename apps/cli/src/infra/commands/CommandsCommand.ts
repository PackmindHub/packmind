import { subcommands } from 'cmd-ts';
import { listCommandsCommand } from './ListCommandsCommand';

export const commandsCommand = subcommands({
  name: 'commands',
  description: 'Manage commands',
  cmds: {
    list: listCommandsCommand,
  },
});
