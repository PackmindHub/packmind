import { command, flag } from 'cmd-ts';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
} from '../../utils/consoleLogger';

// Read version from package.json (bundled by esbuild)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: CLI_VERSION } = require('../../../../package.json');

export const installDefaultSkillsCommand = command({
  name: 'install-default',
  description: 'Install default Packmind skills for configured coding agents',
  args: {
    includeBeta: flag({
      long: 'include-beta',
      description: 'Include unreleased/beta skills',
    }),
  },
  handler: async ({ includeBeta }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    try {
      logInfoConsole('Installing default skills...');

      // Read agents configuration from packmind.json
      const config = await packmindCliHexa.readFullConfig(process.cwd());
      const agents = config?.agents;

      const result = await packmindCliHexa.installDefaultSkills({
        includeBeta,
        cliVersion: includeBeta ? undefined : CLI_VERSION,
        agents,
      });

      if (result.errors.length > 0) {
        for (const error of result.errors) {
          logErrorConsole(`Error: ${error}`);
        }
        process.exit(1);
      }

      const totalFiles = result.filesCreated + result.filesUpdated;

      if (totalFiles === 0) {
        logInfoConsole('Default skills are already up to date.');
      } else {
        logSuccessConsole('Default skills installed successfully!');
        if (result.filesCreated > 0) {
          logInfoConsole(`  Files created: ${result.filesCreated}`);
        }
        if (result.filesUpdated > 0) {
          logInfoConsole(`  Files updated: ${result.filesUpdated}`);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        logErrorConsole(`Installation failed: ${error.message}`);
      } else {
        logErrorConsole(`Installation failed: ${String(error)}`);
      }
      process.exit(1);
    }
  },
});
