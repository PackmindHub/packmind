import { subcommands } from 'cmd-ts';
import { createStandardCommand } from './CreateStandardCommand';

export const standardsCommand = subcommands({
  name: 'standards',
  description: 'Manage coding standards',
  cmds: {
    create: createStandardCommand,
  },
});
