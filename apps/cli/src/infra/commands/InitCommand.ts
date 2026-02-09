import { command } from 'cmd-ts';
import { CodingAgent, RENDER_MODE_TO_CODING_AGENT } from '@packmind/types';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { ConfigFileRepository } from '../repositories/ConfigFileRepository';
import { AgentArtifactDetectionService } from '../../application/services/AgentArtifactDetectionService';
import { DeploymentGateway } from '../repositories/DeploymentGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { loadApiKey } from '../utils/credentials';
import { initHandler } from './initHandler';
import { logErrorConsole } from '../utils/consoleLogger';

// Read version from package.json (bundled by esbuild)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: CLI_VERSION } = require('../../../package.json');

export const initCommand = command({
  name: 'init',
  description: 'Initialize Packmind in the current project',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);
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

    const result = await initHandler({
      configRepository,
      agentDetectionService,
      baseDirectory,
      installDefaultSkills:
        packmindCliHexa.installDefaultSkills.bind(packmindCliHexa),
      cliVersion: CLI_VERSION,
      fetchOrganizationAgents,
    });

    if (!result.success) {
      for (const error of result.errors) {
        logErrorConsole(`Error: ${error}`);
      }
      process.exit(1);
    }
  },
});
