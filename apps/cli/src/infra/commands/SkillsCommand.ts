import { subcommands } from 'cmd-ts';
import { addSkillCommand } from './skills/AddSkillCommand';
import { installDefaultSkillsCommand } from './skills/InstallDefaultSkillsCommand';

export const skillsCommand = subcommands({
  name: 'skills',
  description: 'Manage skills in your Packmind organization',
  cmds: {
    add: addSkillCommand,
    'install-default': installDefaultSkillsCommand,
  },
});
