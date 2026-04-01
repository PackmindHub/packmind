import { command, option, restPositionals, string } from 'cmd-ts';
import { ConfigFileRepository } from '../repositories/ConfigFileRepository';
import { addAgentsHandler } from './agents/addAgentsHandler';

export const addAgentsCommand = command({
  name: 'add',
  description: 'Add coding agents to packmind.json files',
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
      description: 'Agent identifiers to add (e.g. claude cursor)',
    }),
  },
  handler: async ({ path: pathArg, agentNames }) => {
    const configRepository = new ConfigFileRepository();

    await addAgentsHandler(
      { agentNames, path: pathArg || undefined },
      {
        configRepository,
        exit: process.exit,
        getCwd: () => process.cwd(),
      },
    );
  },
});
