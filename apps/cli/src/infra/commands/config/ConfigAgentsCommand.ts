import { command } from 'cmd-ts';
import { ConfigFileRepository } from '../../repositories/ConfigFileRepository';
import { AgentArtifactDetectionService } from '../../../application/services/AgentArtifactDetectionService';
import { configAgentsHandler } from './configAgentsHandler';
import { loadApiKey } from '../../utils/credentials';
import { CodingAgent, RENDER_MODE_TO_CODING_AGENT } from '@packmind/types';
import { PackmindHttpClient } from '../../http/PackmindHttpClient';
import { DeploymentGateway } from '../../repositories/DeploymentGateway';

export const configAgentsCommand = command({
  name: 'agents',
  description: 'Configure which coding agents to generate artifacts for',
  args: {},
  handler: async () => {
    const configRepository = new ConfigFileRepository();
    const agentDetectionService = new AgentArtifactDetectionService();
    const baseDirectory = process.cwd();

    const apiKey = loadApiKey();
    const fetchOrganizationAgents = apiKey
      ? async (): Promise<CodingAgent[]> => {
          const httpClient = new PackmindHttpClient(apiKey);
          const gateway = new DeploymentGateway(httpClient);
          const result = await gateway.getRenderModeConfiguration({});
          if (!result.configuration) return [];
          return result.configuration.activeRenderModes
            .map((mode) => RENDER_MODE_TO_CODING_AGENT[mode])
            .filter((agent): agent is CodingAgent => agent !== undefined);
        }
      : undefined;

    await configAgentsHandler({
      configRepository,
      agentDetectionService,
      baseDirectory,
      fetchOrganizationAgents,
    });
  },
});
