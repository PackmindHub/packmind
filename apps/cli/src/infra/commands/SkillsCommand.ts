import { subcommands } from 'cmd-ts';
import { addSkillCommand } from './skills/AddSkillCommand';
import { deleteSkillCommand } from './skills/DeleteSkillCommand';
import { updateSkillCommand } from './skills/UpdateSkillCommand';

export const skillsCommand = subcommands({
  name: 'skills',
  description: 'Manage skills in your Packmind organization',
  cmds: {
    add: addSkillCommand,
    delete: deleteSkillCommand,
    update: updateSkillCommand,
  },
});
