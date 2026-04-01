import { subcommands } from 'cmd-ts';
import { listAgentsCommand } from './ListAgentsCommand';
import { addAgentsCommand } from './AddAgentsCommand';
import { removeAgentsCommand } from './RemoveAgentsCommand';

export const agentsCommand = subcommands({
  name: 'agents',
  description: 'Manage coding agents in packmind.json files',
  cmds: {
    list: listAgentsCommand,
    add: addAgentsCommand,
    rm: removeAgentsCommand,
  },
});
