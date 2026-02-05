import { subcommands } from 'cmd-ts';
import { createPackageCommand } from './CreatePackageCommand';
import { addToPackageCommand } from './AddToPackageCommand';
import { listPackagesCommand } from './listPackagesCommand';

export const packagesCommand = subcommands({
  name: 'packages',
  description: 'Manage packages',
  cmds: {
    create: createPackageCommand,
    add: addToPackageCommand,
    list: listPackagesCommand,
  },
});
