import { command, positional, string, optional, option } from 'cmd-ts';
import { originSkillOption } from './sharedOptions';
import { SpaceSlug } from './customParameters/SpaceSlug';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../PackmindCliHexa';

export const createStandardCommand = command({
  name: 'create',
  description:
    '[Deprecated] Create a coding standard from a playbook JSON file or stdin',
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
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    packmindCliHexa.output.notifyError(
      'Command "packmind-cli standards create" has been removed.',
      {
        content: 'Use the "playbook add" command instead:',
        exampleCommand:
          'packmind-cli playbook add .packmind/standards/my-standard.md',
      },
    );
    process.exit(1);
  },
});
