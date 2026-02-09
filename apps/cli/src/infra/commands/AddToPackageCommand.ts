import { command, option, string, multioption, array } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { AddToPackageUseCase } from '../../application/useCases/AddToPackageUseCase';
import { addToPackageHandler } from './addToPackageHandler';
import { logErrorConsole } from '../utils/consoleLogger';
import { ItemType } from '../../domain/useCases/IAddToPackageUseCase';
import { originSkillOption } from './sharedOptions';

export const addToPackageCommand = command({
  name: 'add',
  description: 'Add standards, commands, or skills to a package',
  args: {
    to: option({
      long: 'to',
      description: 'Target package slug',
      type: string,
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
    const standardSlugs = standards ?? [];
    const commandSlugs = commands ?? [];
    const skillSlugs = skills ?? [];

    const itemTypes = (
      [
        { type: 'standard' as ItemType, slugs: standardSlugs },
        { type: 'command' as ItemType, slugs: commandSlugs },
        { type: 'skill' as ItemType, slugs: skillSlugs },
      ] as { type: ItemType; slugs: string[] }[]
    ).filter((t) => t.slugs.length > 0);

    if (itemTypes.length === 0) {
      logErrorConsole(
        'Error: At least one --standard, --command, or --skill is required',
      );
      process.exit(1);
    }

    if (itemTypes.length > 1) {
      logErrorConsole(
        'Cannot add standards, commands, and skills simultaneously.  Use dedicated commands for each artefact.',
      );
      process.exit(1);
    }

    const { type: itemType, slugs: itemSlugs } = itemTypes[0];

    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const hexa = new PackmindCliHexa(packmindLogger);
    const gateway = hexa.getPackmindGateway();
    const useCase = new AddToPackageUseCase(gateway);

    const result = await addToPackageHandler(
      to,
      itemType,
      itemSlugs,
      useCase,
      originSkill,
    );

    if (!result.success) {
      process.exit(1);
    }
  },
});
