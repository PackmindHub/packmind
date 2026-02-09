import { command, positional, string, option, optional } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { createPackageHandler } from './createPackageHandler';
import {
  logErrorConsole,
  logConsole,
  formatSlug,
  formatLabel,
  formatCommand,
  formatHeader,
} from '../utils/consoleLogger';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { CreatePackageUseCase } from '../../application/useCases/CreatePackageUseCase';
import { originSkillOption } from './sharedOptions';

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
    originSkill: originSkillOption,
  },
  handler: async ({ name, description, originSkill }) => {
    try {
      const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
      const hexa = new PackmindCliHexa(packmindLogger);
      const gateway = hexa.getPackmindGateway();
      const useCase = new CreatePackageUseCase(gateway);

      const result = await createPackageHandler(
        name,
        description,
        useCase,
        originSkill,
      );

      if (result.success) {
        logConsole('');
        logConsole(formatHeader(`✅ Package created successfully\n`));
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
          `  ${formatLabel('Install:')}  ${formatCommand(`packmind-cli packages install ${result.slug}`)}`,
        );
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
