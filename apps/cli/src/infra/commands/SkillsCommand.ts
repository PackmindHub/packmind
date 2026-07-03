import { subcommands } from 'cmd-ts';
import { installDefaultSkillsCommand } from './skills/InstallDefaultSkillsCommand';
import { listSkillsCommand } from './ListSkillsCommand';

export const skillsCommand = subcommands({
  name: 'skills',
  description: 'Manage skills in your Packmind organization',
  cmds: {
    init: installDefaultSkillsCommand,
    list: listSkillsCommand,
  },
});
