import { subcommands } from 'cmd-ts';
import { createCommandCommand } from './CreateCommandCommand';
import { listCommandsCommand } from './ListCommandsCommand';

export const commandsCommand = subcommands({
  name: 'commands',
  description: 'Manage commands',
  cmds: {
    create: createCommandCommand,
    list: listCommandsCommand,
  },
});
