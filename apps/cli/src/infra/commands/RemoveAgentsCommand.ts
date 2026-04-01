import { command, option, restPositionals, string } from 'cmd-ts';
import { ConfigFileRepository } from '../repositories/ConfigFileRepository';
import { removeAgentsHandler } from './agents/removeAgentsHandler';

export const removeAgentsCommand = command({
  name: 'remove',
  description: 'Remove coding agents from packmind.json files',
  args: {
    path: option({
      type: string,
      short: 'p',
      long: 'path',
      defaultValue: () => '',
      description:
        'Run in the specified directory (recursive within that path)',
    }),
    agentNames: restPositionals({
      type: string,
      displayName: 'agents',
      description: 'Agent identifiers to remove (e.g. claude cursor)',
    }),
  },
  handler: async ({ path: pathArg, agentNames }) => {
    const configRepository = new ConfigFileRepository();

    await removeAgentsHandler(
      { agentNames, path: pathArg || undefined },
      {
        configRepository,
        exit: process.exit,
        getCwd: () => process.cwd(),
      },
    );
  },
});
