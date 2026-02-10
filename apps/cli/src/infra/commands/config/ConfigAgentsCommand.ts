import { command } from 'cmd-ts';
import { ConfigFileRepository } from '../../repositories/ConfigFileRepository';
import { AgentArtifactDetectionService } from '../../../application/services/AgentArtifactDetectionService';
import { configAgentsHandler } from './configAgentsHandler';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';

export const configAgentsCommand = command({
  name: 'agents',
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
