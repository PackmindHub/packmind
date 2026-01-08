import { command, option, string, positional } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
} from '../utils/consoleLogger';

export const uploadSkillCommand = command({
  name: 'upload-skill',
  description: 'Upload a skill from a local directory to a Packmind space',
  args: {
    skillPath: positional({
      type: string,
      displayName: 'path',
      description: 'Path to skill directory containing SKILL.md',
    }),
    spaceId: option({
      type: string,
      long: 'space',
      short: 's',
      description: 'Space ID to upload the skill to',
    }),
  },
  handler: async ({ skillPath, spaceId }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    try {
      logInfoConsole(`Uploading skill from ${skillPath}...`);

      const result = await packmindCliHexa.uploadSkill({
        skillPath,
        spaceId,
        organizationId: '',
        userId: '',
      });

      logSuccessConsole('Skill uploaded successfully!');
      console.log(`  Skill ID: ${result.skillId}`);
      console.log(`  Name: ${result.name}`);
      console.log(`  Files: ${result.fileCount}`);
      console.log(`  Total size: ${(result.totalSize / 1024).toFixed(2)} KB`);
    } catch (error) {
      if (error instanceof Error) {
        logErrorConsole(`Upload failed: ${error.message}`);
      } else {
        logErrorConsole(`Upload failed: ${String(error)}`);
      }
      process.exit(1);
    }
  },
});
