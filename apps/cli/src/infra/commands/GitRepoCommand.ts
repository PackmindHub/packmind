import { subcommands } from 'cmd-ts';
import { listGitReposCommand } from './ListGitReposCommand';

export const gitRepoCommand = subcommands({
  name: 'repo',
  description: 'Manage git repositories under a connection',
  cmds: {
    list: listGitReposCommand,
  },
});
