import { command, flag } from 'cmd-ts';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
  logWarningConsole,
  formatCommand,
} from '../../utils/consoleLogger';
import * as readline from 'readline';
import { IncompatibleInstalledSkill } from '../../../domain/useCases/IInstallDefaultSkillsUseCase';
import { handleIncompatibleInstalledSkills } from './incompatibleSkillsHandler';

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

      const baseDirectory = process.cwd();
      const result = await packmindCliHexa.installDefaultSkills({
        includeBeta,
        cliVersion: includeBeta ? undefined : CLI_VERSION,
        baseDirectory,
      });

      if (result.skippedSkillsCount > 0) {
        logWarningConsole(
          `${result.skippedSkillsCount} skill(s) were skipped because they require a newer version of packmind-cli. Run "${formatCommand('packmind-cli update')}" to get the latest version.`,
        );
      }

      if (result.skippedIncompatibleSkillNames.length > 0) {
        for (const skillName of result.skippedIncompatibleSkillNames) {
          logWarningConsole(
            `Skill "${skillName}" was not installed because it is not compatible with this version of packmind-cli.`,
          );
        }
      }

      if (result.incompatibleInstalledSkills.length > 0) {
        await handleIncompatibleInstalledSkillsWithPrompt(
          result.incompatibleInstalledSkills,
          baseDirectory,
        );
      }

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

async function handleIncompatibleInstalledSkillsWithPrompt(
  skills: IncompatibleInstalledSkill[],
  baseDirectory: string,
): Promise<void> {
  await handleIncompatibleInstalledSkills(skills, baseDirectory, () =>
    promptConfirmation('Confirm deletion? [y/N]: '),
  );
}

async function promptConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}
