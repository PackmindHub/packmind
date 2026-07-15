import { subcommands } from 'cmd-ts';
import { listStandardsCommand } from './ListStandardsCommand';

export const standardsCommand = subcommands({
  name: 'standards',
  description: 'Manage coding standards',
  cmds: {
    list: listStandardsCommand,
  },
});
