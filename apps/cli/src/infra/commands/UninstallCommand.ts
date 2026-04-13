import { command, restPositionals, string } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logConsole,
  logErrorConsole,
  logWarningConsole,
} from '../utils/consoleLogger';
import { IInstallResult } from '../../domain/useCases/IInstallUseCase';

function buildUninstallSummary(result: IInstallResult): string {
  const removedParts = [
    result.standardsRemoved > 0
      ? `${result.standardsRemoved} ${result.standardsRemoved === 1 ? 'standard' : 'standards'}`
      : null,
    result.commandsRemoved > 0
      ? `${result.commandsRemoved} ${result.commandsRemoved === 1 ? 'command' : 'commands'}`
      : null,
    result.skillsRemoved > 0
      ? `${result.skillsRemoved} ${result.skillsRemoved === 1 ? 'skill' : 'skills'}`
      : null,
    result.recipesRemoved > 0
      ? `${result.recipesRemoved} ${result.recipesRemoved === 1 ? 'recipe' : 'recipes'}`
      : null,
  ].filter(Boolean);

  if (removedParts.length === 0) {
    return '✅ Package removed';
  }

  return `✅ Removed ${removedParts.join(', ')}`;
}

export const uninstallCommand = command({
  name: 'uninstall',
  description:
    'Uninstall packages and sync artifacts. Specify package slugs (e.g. @my-space/my-package) to uninstall.',
  aliases: ['remove'],
  args: {
    packages: restPositionals({
      type: string,
      displayName: 'packages',
      description: 'Package slugs to uninstall (e.g. @my-space/my-package)',
    }),
  },
  handler: async ({ packages }) => {
    if (packages.length === 0) {
      logErrorConsole('Please specify at least one package to uninstall.');
      process.exit(1);
    }

    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    try {
      const result = await packmindCliHexa.uninstall({
        baseDirectory: process.cwd(),
        packages,
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

      logConsole(buildUninstallSummary(result));

      if (result.errors.length > 0) {
        logWarningConsole(`Encountered ${result.errors.length} error(s):`);
        result.errors.forEach((err) => logErrorConsole(`  - ${err}`));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logErrorConsole(`uninstall failed: ${errorMessage}`);
      process.exit(1);
    }
  },
});
