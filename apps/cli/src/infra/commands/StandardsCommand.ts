import { subcommands } from 'cmd-ts';
import { createStandardCommand } from './CreateStandardCommand';

export const standardsCommand = subcommands({
  name: 'standard',
  description: 'Manage coding standards',
  cmds: {
    create: createStandardCommand,
  },
});
