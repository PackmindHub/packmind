import { command, option, string, multioption, array } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { originSkillOption } from './sharedOptions';
import { addToPackageHandler } from './packages/addToPackageHandler';
import { selectItemType } from './packages/selectItemType';
import { PackageSlugArgType } from './customParameters/PackageSlugArgType';

export const addToPackageCommand = command({
  name: 'add',
  description: 'Add standards, commands, or skills to a package',
  args: {
    to: option({
      long: 'to',
      description:
        'Target package slug (use @space/package format when multiple spaces exist)',
      type: PackageSlugArgType,
    }),
    standards: multioption({
      long: 'standard',
      description: 'Standard slug(s) to add',
      type: array(string),
    }),
    commands: multioption({
      long: 'command',
      description: 'Command slug(s) to add',
      type: array(string),
    }),
    skills: multioption({
      long: 'skill',
      description: 'Skill slug(s) to add',
      type: array(string),
    }),
    originSkill: originSkillOption,
  },
  handler: async ({ to, standards, commands, skills, originSkill }) => {
    const { itemType, itemSlugs } = selectItemType(
      { standards, commands, skills },
      'add',
      process.exit,
    );

    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const hexa = new PackmindCliHexa(packmindLogger);

    await addToPackageHandler(
      { to, itemType, itemSlugs, originSkill },
      { hexa, exit: process.exit },
    );
  },
});
