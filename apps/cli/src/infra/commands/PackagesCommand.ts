import { subcommands } from 'cmd-ts';
import { createPackageCommand } from './CreatePackageCommand';
import { addToPackageCommand } from './AddToPackageCommand';
import { moveToPackageCommand } from './MoveToPackageCommand';
import { removeFromPackageCommand } from './RemoveFromPackageCommand';
import { listPackagesCommand } from './listPackagesCommand';
import { showPackageCommand } from './packages/showPackageCommand';

export const packagesCommand = subcommands({
  name: 'packages',
  description: 'Manage packages',
  cmds: {
    create: createPackageCommand,
    add: addToPackageCommand,
    move: moveToPackageCommand,
    remove: removeFromPackageCommand,
    list: listPackagesCommand,
    show: showPackageCommand,
  },
});
