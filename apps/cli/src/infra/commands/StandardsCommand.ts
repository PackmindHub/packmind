import { subcommands } from 'cmd-ts';
import { createStandardCommand } from './CreateStandardCommand';
import { listStandardsCommand } from './ListStandardsCommand';

export const standardsCommand = subcommands({
  name: 'standards',
  description: 'Manage coding standards',
  cmds: {
    create: createStandardCommand,
    list: listStandardsCommand,
  },
});
