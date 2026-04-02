import { command, positional, string, optional, option } from 'cmd-ts';
import { originSkillOption } from './sharedOptions';
import { SpaceSlug } from './customParameters/SpaceSlug';
import {
  logErrorConsole,
  logConsole,
  formatCommand,
} from '../utils/consoleLogger';

export const createCommandCommand = command({
  name: 'create',
  description:
    '[Deprecated] Create a command from a playbook JSON file or stdin',
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
      type: optional(SpaceSlug),
    }),
    originSkill: originSkillOption,
  },
  handler: async () => {
    logErrorConsole('Command "packmind-cli commands create" has been removed.');
    logConsole(
      `Use ${formatCommand('packmind-cli playbook add <path>')} instead.`,
    );
    process.exit(1);
  },
});
