import { command, positional, string, optional, option } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { createCommandHandler } from './commands/createCommandHandler';
import {
  logSuccessConsole,
  logErrorConsole,
  logConsole,
  formatCommand,
} from '../utils/consoleLogger';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { CreateCommandFromPlaybookUseCase } from '../../application/useCases/CreateCommandFromPlaybookUseCase';
import { originSkillOption } from './sharedOptions';

export const createCommandCommand = command({
  name: 'create',
  description: 'Create a command from a playbook JSON file or stdin',
  args: {
    file: positional({
      displayName: 'file',
      description:
        'Path to the command playbook JSON file (reads from stdin if omitted)',
      type: optional(string),
    }),
    space: option({
      long: 'space',
      description: 'Slug of the space in which to create the command',
      type: optional(string),
    }),
    originSkill: originSkillOption,
  },
  handler: async ({ file, space, originSkill }) => {
    try {
      const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
      const hexa = new PackmindCliHexa(packmindLogger);
      const gateway = hexa.getPackmindGateway();
      const useCase = new CreateCommandFromPlaybookUseCase(
        gateway,
        hexa.getSpaceService(),
      );

      const result = await createCommandHandler(
        file,
        useCase,
        originSkill,
        space ?? undefined,
      );

      if (result.success) {
        logSuccessConsole(
          `Command "${result.commandName}" created successfully (ID: ${result.commandId})`,
        );
        if (result.webappUrl) {
          logConsole('');
          logConsole(`View it in the webapp: ${result.webappUrl}`);
        }
        process.exit(0);
      } else {
        logErrorConsole(`Failed to create command: ${result.error}`);
        if (result.error?.includes('Multiple spaces found')) {
          logConsole(
            `\nExample: ${formatCommand(`packmind-cli commands create --space <slug> ${file ?? '<file>'}`)}`,
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
