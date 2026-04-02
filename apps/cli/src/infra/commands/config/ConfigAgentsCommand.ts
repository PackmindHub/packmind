import { command, subcommands } from 'cmd-ts';
import { ConfigFileRepository } from '../../repositories/ConfigFileRepository';
import { AgentArtifactDetectionService } from '../../../application/services/AgentArtifactDetectionService';
import { configAgentsHandler } from './configAgentsHandler';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { addAgentsCommand } from './ConfigAgentsAddCommand';
import { listAgentsCommand } from './ConfigAgentsListCommand';
import { removeAgentsCommand } from './ConfigAgentsRemoveCommand';

const configAgentsSetupCommand = command({
  name: 'setup',
  description: 'Configure which coding agents to generate artifacts for',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);
    const configRepository = new ConfigFileRepository();
    const agentDetectionService = new AgentArtifactDetectionService();
    const baseDirectory = process.cwd();

    await configAgentsHandler({
      configRepository,
      agentDetectionService,
      packmindGateway: packmindCliHexa.getPackmindGateway(),
      baseDirectory,
    });
  },
});

export const configAgentsCommand = subcommands({
  name: 'agents',
  description: 'Manage coding agents configuration',
  cmds: {
    setup: configAgentsSetupCommand,
    add: addAgentsCommand,
    list: listAgentsCommand,
    rm: removeAgentsCommand,
  },
});
