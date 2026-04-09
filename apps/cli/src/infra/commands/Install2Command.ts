import { command, restPositionals, string } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logConsole,
  logErrorConsole,
  logWarningConsole,
} from '../utils/consoleLogger';

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
        logWarningConsole(
          `⚠️  You don't have access to the following packages (their artifacts were preserved from the lock file):\n` +
            result.missingAccess.map((s) => `  - ${s}`).join('\n'),
        );
      }

      logConsole(
        `✅ Install complete: ${result.filesCreated} created, ${result.filesUpdated} updated, ${result.filesDeleted} deleted` +
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
      logErrorConsole(`install-2 failed: ${errorMessage}`);
      process.exit(1);
    }
  },
});
