import { subcommands } from 'cmd-ts';
import { addPlaybookCommand } from './playbook/AddCommand';
import { rmPlaybookCommand } from './playbook/RmCommand';
import { unstagePlaybookCommand } from './playbook/UnstageCommand';
import { statusPlaybookCommand } from './playbook/StatusCommand';
import { submitPlaybookCommand } from './playbook/SubmitCommand';

export const playbookCommand = subcommands({
  name: 'playbook',
  description: 'Manage local playbook files and propose changes to your team',
  cmds: {
    add: addPlaybookCommand,
    rm: rmPlaybookCommand,
    unstage: unstagePlaybookCommand,
    status: statusPlaybookCommand,
    submit: submitPlaybookCommand,
  },
});
