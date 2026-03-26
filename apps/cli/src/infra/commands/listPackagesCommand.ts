import { command, option, optional } from 'cmd-ts';
import {
  ListHandlerDependencies,
  listPackagesHandler,
} from './packages/listPackagesHandler';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { SpaceSlug } from './customParameters/SpaceSlug';

export const listPackagesCommand = command({
  name: 'list',
  description: 'List available packages',
  args: {
    space: option({
      type: optional(SpaceSlug),
      long: 'space',
      description: 'Filter packages by space slug',
    }),
  },
  handler: async ({ space }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    const deps: ListHandlerDependencies = {
      packmindCliHexa,
      exit: process.exit,
    };

    await listPackagesHandler({ space }, deps);
  },
});
