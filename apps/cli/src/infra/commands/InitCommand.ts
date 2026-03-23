import { command } from 'cmd-ts';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { ConfigFileRepository } from '../repositories/ConfigFileRepository';
import { AgentArtifactDetectionService } from '../../application/services/AgentArtifactDetectionService';
import { initHandler } from './initHandler';

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
      packmindGateway: packmindCliHexa.getPackmindGateway(),
      baseDirectory,
      installDefaultSkills:
        packmindCliHexa.installDefaultSkills.bind(packmindCliHexa),
      cliVersion: CLI_VERSION,
      output: packmindCliHexa.output,
    });

    if (!result.success) {
      packmindCliHexa.output.notifyError(
        'The following errors hapenned during initialization:',
        {
          content: result.errors.join('\n'),
        },
      );
      process.exit(1);
    }
  },
});
