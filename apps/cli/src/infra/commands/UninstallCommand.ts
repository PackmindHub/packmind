import { command, restPositionals, string } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  uninstallPackagesHandler,
  PullHandlerDependencies,
} from './pullHandler';

export const uninstallCommand = command({
  name: 'uninstall',
  description:
    'Uninstall packages and remove their recipes and standards from the current directory',
  args: {
    packagesSlugs: restPositionals({
      type: string,
      displayName: 'packages',
      description: 'Package slugs to uninstall (e.g., backend frontend)',
    }),
  },
  handler: async ({ packagesSlugs }) => {
    // Initialize hexa and logger
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    const deps: PullHandlerDependencies = {
      packmindCliHexa,
      exit: process.exit,
      getCwd: () => process.cwd(),
      log: console.log,
      error: console.error,
    };

    // Handle uninstall
    await uninstallPackagesHandler({ packagesSlugs }, deps);
  },
});
