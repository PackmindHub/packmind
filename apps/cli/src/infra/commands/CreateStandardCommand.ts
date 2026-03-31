import { command, positional, string, optional, option } from 'cmd-ts';
import { originSkillOption } from './sharedOptions';
import { SpaceSlug } from './customParameters/SpaceSlug';
import {
  logErrorConsole,
  logConsole,
  formatCommand,
} from '../utils/consoleLogger';

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
      type: optional(SpaceSlug),
    }),
    originSkill: originSkillOption,
  },
  handler: async () => {
    logErrorConsole(
      'Command "packmind-cli standards create" has been removed.',
    );
    logConsole(
      `Use ${formatCommand('packmind-cli playbook add <path>')} instead.`,
    );
    process.exit(1);
  },
});
