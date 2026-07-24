import { subcommands } from 'cmd-ts';
import { listGitReposCommand } from './ListGitReposCommand';
import { addGitRepoCommand } from './AddGitRepoCommand';

export const gitRepoCommand = subcommands({
  name: 'repo',
  description: 'Manage git repositories under a connection',
  cmds: {
    list: listGitReposCommand,
    add: addGitRepoCommand,
  },
});
