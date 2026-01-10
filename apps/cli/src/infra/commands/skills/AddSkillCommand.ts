import { command, string, positional } from 'cmd-ts';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
} from '../../utils/consoleLogger';

export const addSkillCommand = command({
  name: 'add',
  description: 'Add a skill from a local directory to a Packmind organization',
  args: {
    skillPath: positional({
      type: string,
      displayName: 'path',
      description: 'Path to skill directory containing SKILL.md',
    }),
  },
  handler: async ({ skillPath }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    try {
      logInfoConsole(`Uploading skill from ${skillPath}...`);

      const result = await packmindCliHexa.uploadSkill({
        skillPath,
        organizationId: '',
        userId: '',
      });

      logSuccessConsole('Skill uploaded successfully!');
      logInfoConsole(`  Skill ID: ${result.skillId}`);
      logInfoConsole(`  Name: ${result.name}`);
      logInfoConsole(`  Files: ${result.fileCount}`);
      logInfoConsole(
        `  Total size: ${(result.totalSize / 1024).toFixed(2)} KB`,
      );
    } catch (error) {
      if (error instanceof Error) {
        // Provide more helpful message for duplicate skill errors
        if (error.message.includes('already exists')) {
          logErrorConsole(`${error.message}`);
          logInfoConsole('Hint: Skills must have unique names within a space.');
        } else {
          logErrorConsole(`Upload failed: ${error.message}`);
        }
      } else {
        logErrorConsole(`Upload failed: ${String(error)}`);
      }
      process.exit(1);
    }
  },
});
