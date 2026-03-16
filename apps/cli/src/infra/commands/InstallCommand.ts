import { command, restPositionals, string, flag, option } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  listPackagesHandler,
  showPackageHandler,
  installPackagesHandler,
  recursiveInstallHandler,
  statusHandler,
  InstallHandlerDependencies,
} from './installPackagesHandler';

export const installCommand = command({
  name: 'install',
  description:
    'Install commands and standards from specified packages and save them to the current directory',
  aliases: ['pull'],
  args: {
    list: flag({
      long: 'list',
      description: 'List available packages',
    }),
    status: flag({
      long: 'status',
      description:
        'Show status of all packmind.json files and their packages in the workspace',
    }),
    recursive: flag({
      short: 'r',
      long: 'recursive',
      description:
        '[Deprecated] Install is now recursive by default. This flag will be removed in a future version.',
    }),
    path: option({
      type: string,
      short: 'p',
      long: 'path',
      defaultValue: () => '',
      description:
        'Run install in the specified directory (recursive within that path)',
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
  handler: async ({ list, status, recursive, path, show, packagesSlugs }) => {
    // Initialize hexa and logger
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    const deps: InstallHandlerDependencies = {
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

    // Handle --status flag
    if (status) {
      await statusHandler({}, deps);
      return;
    }

    // Handle --show option
    if (show) {
      await showPackageHandler({ slug: show }, deps);
      return;
    }

    // Handle --recursive flag (deprecated, now default behavior)
    if (recursive) {
      console.warn(
        '⚠️  The --recursive flag is deprecated. Install is now recursive by default.',
      );
      await recursiveInstallHandler({ path: path || undefined }, deps);
      return;
    }

    // Handle specific package slugs — install in target directory (cwd or --path)
    if (packagesSlugs.length > 0) {
      await installPackagesHandler(
        { packagesSlugs, path: path || undefined },
        deps,
      );
      return;
    }

    // Default: recursive install (new default behavior)
    await recursiveInstallHandler({ path: path || undefined }, deps);
  },
});
