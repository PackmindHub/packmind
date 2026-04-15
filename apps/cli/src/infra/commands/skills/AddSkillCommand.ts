import { command, string, positional, option, optional } from 'cmd-ts';
import { originSkillOption } from '../sharedOptions';
import { SpaceSlug } from '../customParameters/SpaceSlug';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';

export const addSkillCommand = command({
  name: 'add',
  description:
    '[Deprecated] Add a skill from a local directory to a Packmind organization',
  args: {
    skillPath: positional({
      type: string,
      displayName: 'path',
      description: 'Path to skill directory containing SKILL.md',
    }),
    space: option({
      long: 'space',
      description:
        'Slug of the space in which to add the skill (with or without leading @)',
      type: optional(SpaceSlug),
    }),
    originSkill: originSkillOption,
  },
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    packmindCliHexa.output.notifyError(
      'Command "packmind-cli skills add" has been removed.',
      {
        content: 'Use the "playbook add" command instead:',
        exampleCommand:
          'packmind-cli playbook add .packmind/commands/my-command.md',
      },
    );
    process.exit(1);
  },
});
