import { command, positional, string, option, optional } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { createPackageHandler } from './packages/createPackageHandler';
import {
  logErrorConsole,
  logConsole,
  logSuccessConsole,
  logWarningConsole,
  formatSlug,
  formatLabel,
  formatCommand,
  formatHeader,
} from '../utils/consoleLogger';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { CreatePackageUseCase } from '../../application/useCases/CreatePackageUseCase';
import { originSkillOption } from './sharedOptions';
import { SpaceSlug } from './customParameters/SpaceSlug';

export const createPackageCommand = command({
  name: 'create',
  description: 'Create a new package',
  args: {
    name: positional({
      displayName: 'name',
      description: 'Name of the package to create',
      type: string,
    }),
    description: option({
      long: 'description',
      short: 'd',
      description: 'Description of the package (optional)',
      type: optional(string),
    }),
    space: option({
      long: 'space',
      description: 'Slug of the space in which to create the package',
      type: optional(SpaceSlug),
    }),
    originSkill: originSkillOption,
  },
  handler: async ({ name, description, space, originSkill }) => {
    try {
      const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
      const hexa = new PackmindCliHexa(packmindLogger);
      const gateway = hexa.getPackmindGateway();
      const useCase = new CreatePackageUseCase(gateway, hexa.getSpaceService());

      const result = await createPackageHandler(
        name,
        description,
        useCase,
        originSkill,
        space ?? undefined,
      );

      if (result.success) {
        logConsole('');
        logSuccessConsole('Package created successfully');
        logConsole(`  ${formatLabel('Name:')}  ${result.packageName}`);
        logConsole(
          `  ${formatLabel('Slug:')}  ${formatSlug(result.slug ?? '')}`,
        );
        logConsole('');
        logConsole(formatHeader(`📋 Next steps\n`));
        if (result.webappUrl) {
          logConsole(`  ${formatLabel('Link:')}  ${result.webappUrl}`);
        }
        logConsole(
          `  ${formatLabel('Install:')}  ${formatCommand(`packmind-cli install ${result.slug}`)}`,
        );
        if (result.deduplicated) {
          logWarningConsole(
            `A package with a similar name already existed. Created with slug '${result.slug}'.`,
          );
        }
        logConsole('');
        process.exit(0);
      } else {
        logErrorConsole(`Failed to create package: ${result.error}`);
        process.exit(1);
      }
    } catch (e) {
      logErrorConsole(
        `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
      );
      process.exit(1);
    }
  },
});
