import { command, restPositionals, string } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logConsole,
  logErrorConsole,
  logWarningConsole,
} from '../utils/consoleLogger';

export const uninstall2Command = command({
  name: 'uninstall-2',
  description:
    'Uninstall packages and sync artifacts. Specify package slugs (e.g. @my-space/my-package) to uninstall.',
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
      const result = await packmindCliHexa.uninstall2({
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

      logConsole(
        `✅ Uninstall complete: ${result.filesCreated} created, ${result.filesUpdated} updated, ${result.filesDeleted} deleted` +
          (result.skillDirectoriesDeleted > 0
            ? `, ${result.skillDirectoriesDeleted} skill files cleaned up`
            : '') +
          ` (${result.recipesCount} recipes, ${result.standardsCount} standards, ${result.skillsCount} skills)`,
      );

      if (result.errors.length > 0) {
        logWarningConsole(`Encountered ${result.errors.length} error(s):`);
        result.errors.forEach((err) => logErrorConsole(`  - ${err}`));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logErrorConsole(`uninstall-2 failed: ${errorMessage}`);
      process.exit(1);
    }
  },
});
