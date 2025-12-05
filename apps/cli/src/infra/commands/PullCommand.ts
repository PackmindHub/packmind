import { command, restPositionals, string, flag, option } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  listPackagesHandler,
  showPackageHandler,
  pullPackagesHandler,
  PullHandlerDependencies,
} from './pullHandler';

export const pullCommand = command({
  name: 'pull',
  description:
    'Install recipes and standards from specified packages and save them to the current directory',
  args: {
    list: flag({
      long: 'list',
      description: 'List available packages',
    }),
    show: option({
      type: string,
      long: 'show',
      description: 'Show details of a specific package',
      defaultValue: () => '',
    }),
    packagesSlugs: restPositionals({
      type: string,
      displayName: 'packages',
      description: 'Package slugs to install (e.g., backend frontend)',
    }),
  },
  handler: async ({ list, show, packagesSlugs }) => {
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

    // Handle --list flag
    if (list) {
      await listPackagesHandler({}, deps);
      return;
    }

    // Handle --show option
    if (show) {
      await showPackageHandler({ slug: show }, deps);
      return;
    }

    // Handle pull/install
    await pullPackagesHandler({ packagesSlugs }, deps);
  },
});
