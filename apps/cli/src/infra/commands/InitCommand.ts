import { command } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { ConfigFileRepository } from '../repositories/ConfigFileRepository';
import { AgentArtifactDetectionService } from '../../application/services/AgentArtifactDetectionService';
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

    const result = await initHandler({
      configRepository,
      agentDetectionService,
      baseDirectory,
      installDefaultSkills:
        packmindCliHexa.installDefaultSkills.bind(packmindCliHexa),
      cliVersion: CLI_VERSION,
    });

    if (!result.success) {
      for (const error of result.errors) {
        logErrorConsole(`Error: ${error}`);
      }
      process.exit(1);
    }
  },
});
