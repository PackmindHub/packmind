import { command, positional, string, optional, option } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { createStandardHandler } from './standards/createStandardHandler';
import {
  logSuccessConsole,
  logErrorConsole,
  logConsole,
  formatCommand,
} from '../utils/consoleLogger';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { CreateStandardFromPlaybookUseCase } from '../../application/useCases/CreateStandardFromPlaybookUseCase';
import { originSkillOption } from './sharedOptions';

export const createStandardCommand = command({
  name: 'create',
  description: 'Create a coding standard from a playbook JSON file or stdin',
  args: {
    file: positional({
      displayName: 'file',
      description:
        'Path to the playbook JSON file (reads from stdin if omitted)',
      type: optional(string),
    }),
    space: option({
      long: 'space',
      description:
        'Slug of the space in which to create the standard (with or without leading @)',
      type: optional(string),
    }),
    originSkill: originSkillOption,
  },
  handler: async ({ file, space, originSkill }) => {
    try {
      const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
      const hexa = new PackmindCliHexa(packmindLogger);
      const gateway = hexa.getPackmindGateway();
      const useCase = new CreateStandardFromPlaybookUseCase(
        gateway,
        hexa.getSpaceService(),
      );

      const result = await createStandardHandler(
        file,
        useCase,
        originSkill,
        space ?? undefined,
      );

      if (result.success) {
        logSuccessConsole(
          `Standard "${result.standardName}" created successfully (ID: ${result.standardId})`,
        );
        process.exit(0);
      } else {
        logErrorConsole(`Failed to create standard: ${result.error}`);
        if (result.error?.includes('Multiple spaces found')) {
          logConsole(
            `\nExample: ${formatCommand(`packmind-cli standards create --space <slug> ${file ?? '<file>'}`)}`,
          );
        }
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
