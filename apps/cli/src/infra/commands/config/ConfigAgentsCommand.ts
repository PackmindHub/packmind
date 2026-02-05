import { command } from 'cmd-ts';
import { ConfigFileRepository } from '../../repositories/ConfigFileRepository';
import { AgentArtifactDetectionService } from '../../../application/services/AgentArtifactDetectionService';
import { configAgentsHandler } from './configAgentsHandler';

export const configAgentsCommand = command({
  name: 'agents',
  description: 'Configure which coding agents to generate artifacts for',
  args: {},
  handler: async () => {
    const configRepository = new ConfigFileRepository();
    const agentDetectionService = new AgentArtifactDetectionService();
    const baseDirectory = process.cwd();

    await configAgentsHandler({
      configRepository,
      agentDetectionService,
      baseDirectory,
    });
  },
});
