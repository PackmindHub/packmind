import { command, positional, string } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { createStandardHandler } from './createStandardHandler';
import { logSuccessConsole, logErrorConsole } from '../utils/consoleLogger';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { CreateStandardFromPlaybookUseCase } from '../../application/useCases/CreateStandardFromPlaybookUseCase';

export const createStandardCommand = command({
  name: 'create',
  description: 'Create a coding standard from a playbook JSON file',
  args: {
    file: positional({
      displayName: 'file',
      description: 'Path to the playbook JSON file',
      type: string,
    }),
  },
  handler: async ({ file }) => {
    try {
      const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
      const hexa = new PackmindCliHexa(packmindLogger);
      const gateway = hexa.getPackmindGateway();
      const useCase = new CreateStandardFromPlaybookUseCase(gateway);

      const result = await createStandardHandler(file, useCase);

      if (result.success) {
        await logSuccessConsole(
          `Standard "${result.standardName}" created successfully (ID: ${result.standardId})`,
        );
        process.exit(0);
      } else {
        await logErrorConsole(`Failed to create standard: ${result.error}`);
        process.exit(1);
      }
    } catch (e) {
      await logErrorConsole(
        `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
      );
      process.exit(1);
    }
  },
});
