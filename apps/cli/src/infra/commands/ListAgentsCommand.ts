import { command, option, string } from 'cmd-ts';
import { ConfigFileRepository } from '../repositories/ConfigFileRepository';
import { listAgentsHandler } from './agents/listAgentsHandler';

export const listAgentsCommand = command({
  name: 'list',
  description: 'List coding agents configured across packmind.json files',
  args: {
    path: option({
      type: string,
      short: 'p',
      long: 'path',
      defaultValue: () => '',
      description:
        'Run in the specified directory (recursive within that path)',
    }),
  },
  handler: async ({ path: pathArg }) => {
    const configRepository = new ConfigFileRepository();

    await listAgentsHandler(
      { path: pathArg || undefined },
      {
        configRepository,
        exit: process.exit,
        getCwd: () => process.cwd(),
      },
    );
  },
});
