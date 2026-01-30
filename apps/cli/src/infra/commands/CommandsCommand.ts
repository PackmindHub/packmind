import { subcommands } from 'cmd-ts';
import { createCommandCommand } from './CreateCommandCommand';

export const commandsCommand = subcommands({
  name: 'commands',
  description: 'Manage commands',
  cmds: {
    create: createCommandCommand,
  },
});
