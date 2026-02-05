import { command } from 'cmd-ts';
import {
  InstallHandlerDependencies,
  listPackagesHandler,
} from './installPackagesHandler';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../PackmindCliHexa';

export const listPackagesCommand = command({
  name: 'list',
  description: 'List available packages',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    const deps: InstallHandlerDependencies = {
      packmindCliHexa,
      exit: process.exit,
      getCwd: () => process.cwd(),
      log: console.log,
      error: console.error,
    };

    await listPackagesHandler({}, deps);
  },
});
