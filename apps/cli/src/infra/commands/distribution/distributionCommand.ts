import { subcommands } from 'cmd-ts';
import { recordCommand } from './recordCommand';

export const distributionCommand = subcommands({
  name: 'distribution',
  description: "Manage Packmind's view of what this repository runs",
  cmds: {
    record: recordCommand,
  },
});
