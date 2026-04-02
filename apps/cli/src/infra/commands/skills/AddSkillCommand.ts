import { command, string, positional, option, optional } from 'cmd-ts';
import { originSkillOption } from '../sharedOptions';
import { SpaceSlug } from '../customParameters/SpaceSlug';
import {
  logErrorConsole,
  logConsole,
  formatCommand,
} from '../../utils/consoleLogger';

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
    logErrorConsole('Command "packmind-cli skills add" has been removed.');
    logConsole(
      `Use ${formatCommand('packmind-cli playbook add <path>')} instead.`,
    );
    process.exit(1);
  },
});
