import { command, option, string } from 'cmd-ts';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { ConfigFileRepository } from '../../repositories/ConfigFileRepository';
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
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);
    const configRepository = new ConfigFileRepository();

    await listAgentsHandler(
      { path: pathArg || undefined },
      {
        configRepository,
        deploymentGateway: packmindCliHexa.getPackmindGateway().deployment,
        exit: process.exit,
        getCwd: () => process.cwd(),
      },
    );
  },
});
