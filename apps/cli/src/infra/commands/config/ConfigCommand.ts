import { subcommands } from 'cmd-ts';
import { configAgentsCommand } from './ConfigAgentsCommand';

export const configCommand = subcommands({
  name: 'config',
  description: 'Manage Packmind configuration',
  cmds: {
    agents: configAgentsCommand,
  },
});
