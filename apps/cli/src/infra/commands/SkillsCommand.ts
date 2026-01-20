import { subcommands } from 'cmd-ts';
import { addSkillCommand } from './skills/AddSkillCommand';
import { installDefaultSkillsCommand } from './skills/InstallDefaultSkillsCommand';
import { deleteSkillCommand } from './skills/DeleteSkillCommand';
import { updateSkillCommand } from './skills/UpdateSkillCommand';

export const skillsCommand = subcommands({
  name: 'skills',
  description: 'Manage skills in your Packmind organization',
  cmds: {
    add: addSkillCommand,
    'install-default': installDefaultSkillsCommand,
    delete: deleteSkillCommand,
    update: updateSkillCommand,
  },
});
