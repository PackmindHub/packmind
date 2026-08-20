import { subcommands } from 'cmd-ts';
import { infoCommand } from './infoCommand';
import { trackCommand } from './trackCommand';
import { untrackCommand } from './untrackCommand';

export const gitCommand = subcommands({
  name: 'git',
  description: 'Manage repository tracking in Packmind',
  cmds: {
    info: infoCommand,
    track: trackCommand,
    untrack: untrackCommand,
  },
});
