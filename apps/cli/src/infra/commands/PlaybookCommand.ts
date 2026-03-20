import { subcommands } from 'cmd-ts';
import { addPlaybookCommand } from './playbook/AddCommand';
import { rmPlaybookCommand } from './playbook/RmCommand';
import { unstagePlaybookCommand } from './playbook/UnstageCommand';
import { statusPlaybookCommand } from './playbook/StatusCommand';
import { submitPlaybookCommand } from './playbook/SubmitCommand';

export const playbookCommand = subcommands({
  name: 'playbook',
  description: 'Track local changes to deployed Packmind artifacts',
  cmds: {
    add: addPlaybookCommand,
    rm: rmPlaybookCommand,
    unstage: unstagePlaybookCommand,
    status: statusPlaybookCommand,
    submit: submitPlaybookCommand,
  },
});
