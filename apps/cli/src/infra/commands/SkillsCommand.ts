import { subcommands } from 'cmd-ts';
import { addSkillCommand } from './skills/AddSkillCommand';

export const skillsCommand = subcommands({
  name: 'skills',
  description: 'Manage skills in your Packmind organization',
  cmds: {
    add: addSkillCommand,
  },
});
