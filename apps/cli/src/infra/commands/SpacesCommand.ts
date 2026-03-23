import { subcommands } from 'cmd-ts';
import { listSpacesCommand } from './ListSpacesCommand';

export const spacesCommand = subcommands({
  name: 'spaces',
  description: 'Manage spaces in your Packmind organization',
  cmds: {
    list: listSpacesCommand,
  },
});
