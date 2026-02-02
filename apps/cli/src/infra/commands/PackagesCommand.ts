import { subcommands } from 'cmd-ts';
import { createPackageCommand } from './CreatePackageCommand';

export const packagesCommand = subcommands({
  name: 'packages',
  description: 'Manage packages',
  cmds: {
    create: createPackageCommand,
  },
});
