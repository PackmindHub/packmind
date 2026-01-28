import { command } from 'cmd-ts';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
} from '../../utils/consoleLogger';

export const installDefaultSkillsCommand = command({
  name: 'install-default',
  description: 'Install default Packmind skills for configured coding agents',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    try {
      await logInfoConsole('Installing default skills...');

      const result = await packmindCliHexa.installDefaultSkills({});

      if (result.errors.length > 0) {
        for (const error of result.errors) {
          await logErrorConsole(`Error: ${error}`);
        }
        process.exit(1);
      }

      const totalFiles = result.filesCreated + result.filesUpdated;

      if (totalFiles === 0) {
        await logInfoConsole('Default skills are already up to date.');
      } else {
        await logSuccessConsole('Default skills installed successfully!');
        if (result.filesCreated > 0) {
          await logInfoConsole(`  Files created: ${result.filesCreated}`);
        }
        if (result.filesUpdated > 0) {
          await logInfoConsole(`  Files updated: ${result.filesUpdated}`);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        await logErrorConsole(`Installation failed: ${error.message}`);
      } else {
        await logErrorConsole(`Installation failed: ${String(error)}`);
      }
      process.exit(1);
    }
  },
});
