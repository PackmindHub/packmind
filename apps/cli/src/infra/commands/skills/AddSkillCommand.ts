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
      await logInfoConsole(`Uploading skill from ${skillPath}...`);

      const result = await packmindCliHexa.uploadSkill({
        skillPath,
        organizationId: '',
        userId: '',
      });

      if (result.isNewSkill) {
        await logSuccessConsole('Skill created successfully!');
      } else if (!result.versionCreated) {
        await logInfoConsole(
          `Skill content is identical to version ${result.version}, no new version created.`,
        );
      } else {
        await logSuccessConsole(`Skill updated to version ${result.version}!`);
      }
      await logInfoConsole(`  Name: ${result.name}`);
      await logInfoConsole(`  Version: ${result.version}`);
      await logInfoConsole(`  Files: ${result.fileCount}`);
      await logInfoConsole(
        `  Total size: ${(result.totalSize / 1024).toFixed(2)} KB`,
      );
    } catch (error) {
      if (error instanceof Error) {
        await logErrorConsole(`Upload failed: ${error.message}`);
      } else {
        await logErrorConsole(`Upload failed: ${String(error)}`);
      }
      process.exit(1);
    }
  },
});
