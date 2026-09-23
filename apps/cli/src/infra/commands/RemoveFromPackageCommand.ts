import { command, option, string, multioption, array } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { removeFromPackageHandler } from './packages/removeFromPackageHandler';
import { selectItemType } from './packages/selectItemType';
import { PackageSlugArgType } from './customParameters/PackageSlugArgType';

export const removeFromPackageCommand = command({
  name: 'remove',
  description: 'Remove standards, commands, or skills from a package',
  args: {
    from: option({
      long: 'from',
      description:
        'Package slug to remove from (use @space/package format when multiple spaces exist)',
      type: PackageSlugArgType,
    }),
    standards: multioption({
      long: 'standard',
      description: 'Standard slug(s) to remove',
      type: array(string),
    }),
    commands: multioption({
      long: 'command',
      description: 'Command slug(s) to remove',
      type: array(string),
    }),
    skills: multioption({
      long: 'skill',
      description: 'Skill slug(s) to remove',
      type: array(string),
    }),
  },
  handler: async ({ from, standards, commands, skills }) => {
    const { itemType, itemSlugs } = selectItemType(
      { standards, commands, skills },
      'remove',
      process.exit,
    );

    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const hexa = new PackmindCliHexa(packmindLogger);

    await removeFromPackageHandler(
      { from, itemType, itemSlugs },
      { hexa, exit: process.exit },
    );
  },
});
