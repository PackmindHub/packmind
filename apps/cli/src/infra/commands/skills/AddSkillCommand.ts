import { command, string, positional, option, optional } from 'cmd-ts';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
  logConsole,
  formatCommand,
} from '../../utils/consoleLogger';
import { originSkillOption } from '../sharedOptions';
import { SpaceSlug } from '../customParameters/SpaceSlug';

export const addSkillCommand = command({
  name: 'add',
  description: 'Add a skill from a local directory to a Packmind organization',
  args: {
    skillPath: positional({
      type: string,
      displayName: 'path',
      description: 'Path to skill directory containing SKILL.md',
    }),
    space: option({
      long: 'space',
      description:
        'Slug of the space in which to add the skill (with or without leading @)',
      type: optional(SpaceSlug),
    }),
    originSkill: originSkillOption,
  },
  handler: async ({ skillPath, space, originSkill }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    try {
      logInfoConsole(`Uploading skill from ${skillPath}...`);

      const result = await packmindCliHexa.uploadSkill({
        skillPath,
        originSkill,
        spaceSlug: space ?? undefined,
      });

      if (result.isNewSkill) {
        logSuccessConsole('Skill created successfully!');
      } else if (!result.versionCreated) {
        logInfoConsole(
          `Skill content is identical to version ${result.version}, no new version created.`,
        );
      } else {
        logSuccessConsole(`Skill updated to version ${result.version}!`);
      }
      logInfoConsole(`  Name: ${result.name}`);
      logInfoConsole(`  Version: ${result.version}`);
      logInfoConsole(`  Files: ${result.fileCount}`);
      logInfoConsole(
        `  Total size: ${(result.totalSize / 1024).toFixed(2)} KB`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logErrorConsole(`Upload failed: ${message}`);
      if (message.includes('Multiple spaces found')) {
        logConsole(
          `\nExample: ${formatCommand(`packmind-cli skills add --space <slug> ${skillPath}`)}`,
        );
      }
      process.exit(1);
    }
  },
});
