import { command, positional, string, option, optional } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { createPackageHandler } from './createPackageHandler';
import {
  logErrorConsole,
  logConsole,
  logSuccessConsole,
} from '../utils/consoleLogger';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { CreatePackageUseCase } from '../../application/useCases/CreatePackageUseCase';

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
  },
  handler: async ({ name, description }) => {
    try {
      const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
      const hexa = new PackmindCliHexa(packmindLogger);
      const gateway = hexa.getPackmindGateway();
      const useCase = new CreatePackageUseCase(gateway);

      const result = await createPackageHandler(name, description, useCase);

      if (result.success) {
        logSuccessConsole(
          `Package "${result.packageName}" created successfully`,
        );
        logConsole('');
        logConsole(`Created: ${result.slug}`);
        if (result.webappUrl) {
          logConsole(`You can see it at: ${result.webappUrl}`);
        }
        logConsole(
          `You can install it with: packmind-cli packages install ${result.slug}`,
        );
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
