import { subcommands } from 'cmd-ts';
import { createCommandCommand } from './CreateCommandCommand';

export const commandsCommand = subcommands({
  name: 'command',
  description: 'Manage commands',
  cmds: {
    create: createCommandCommand,
  },
});
