import { command, restPositionals, string } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logConsole,
  logErrorConsole,
  logWarningConsole,
} from '../utils/consoleLogger';
import { IInstallResult } from '../../domain/useCases/IInstallUseCase';

function buildInstallSummary(result: IInstallResult): string {
  const contentParts = [
    result.standardsCount > 0
      ? `${result.standardsCount} ${result.standardsCount === 1 ? 'standard' : 'standards'}`
      : null,
    result.commandsCount > 0
      ? `${result.commandsCount} ${result.commandsCount === 1 ? 'command' : 'commands'}`
      : null,
    result.skillsCount > 0
      ? `${result.skillsCount} ${result.skillsCount === 1 ? 'skill' : 'skills'}`
      : null,
    result.recipesCount > 0
      ? `${result.recipesCount} ${result.recipesCount === 1 ? 'recipe' : 'recipes'}`
      : null,
  ].filter(Boolean);

  const contentChanged = result.contentFilesChanged > 0;

  if (!contentChanged && contentParts.length === 0) {
    return '✅ Nothing to install';
  }

  if (!contentChanged) {
    return `✅ Already up to date — ${contentParts.join(', ')}`;
  }

  if (contentParts.length === 0) {
    return '✅ Packages removed';
  }

  return `✅ Synced ${contentParts.join(', ')}`;
}

export const install2Command = command({
  name: 'install-2',
  description:
    'Install packages using the new space-aware endpoint. Optionally specify package slugs (e.g. @my-space/my-package) to install.',
  args: {
    packages: restPositionals({
      type: string,
      displayName: 'packages',
      description: 'Package slugs to install (e.g. @my-space/my-package)',
    }),
  },
  handler: async ({ packages }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    const cwd = process.cwd();

    try {
      const result = await packmindCliHexa.install2({
        baseDirectory: cwd,
        packages: packages.length > 0 ? packages : undefined,
      });

      if (result.missingAccess.length > 0) {
        let warning =
          `⚠️  You don't have access to the following packages (their artifacts were preserved from the lock file):\n` +
          result.missingAccess.map((s) => `  - ${s}`).join('\n');

        if (result.joinSpaceUrl) {
          warning += `\n\n  👉 Join the space to get access: ${result.joinSpaceUrl}`;
        }

        logWarningConsole(warning);
      }

      logConsole(buildInstallSummary(result));

      if (result.errors.length > 0) {
        logWarningConsole(`Encountered ${result.errors.length} error(s):`);
        result.errors.forEach((err) => logErrorConsole(`  - ${err}`));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logErrorConsole(`install-2 failed: ${errorMessage}`);
      process.exit(1);
    }
  },
});
