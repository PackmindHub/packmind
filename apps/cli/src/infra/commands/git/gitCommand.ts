import { subcommands } from 'cmd-ts';
import { trackCommand } from './trackCommand';
import { untrackCommand } from './untrackCommand';

export const gitCommand = subcommands({
  name: 'git',
  description: 'Manage repository tracking in Packmind',
  cmds: {
    track: trackCommand,
    untrack: untrackCommand,
  },
});
