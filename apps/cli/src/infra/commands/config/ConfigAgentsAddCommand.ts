import * as readline from 'readline';
import { command, option, restPositionals, string } from 'cmd-ts';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { ConfigFileRepository } from '../../repositories/ConfigFileRepository';
import { addAgentsHandler } from './agents/addAgentsHandler';

function createPromptConfirm(): (message: string) => Promise<boolean> {
  return (message: string) =>
    new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(`${message} (y/N) `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      });
    });
}

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
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);
    const configRepository = new ConfigFileRepository();

    await addAgentsHandler(
      { agentNames, path: pathArg || undefined },
      {
        configRepository,
        deploymentGateway: packmindCliHexa.getPackmindGateway().deployment,
        exit: process.exit,
        getCwd: () => process.cwd(),
        promptConfirm: createPromptConfirm(),
      },
    );
  },
});
