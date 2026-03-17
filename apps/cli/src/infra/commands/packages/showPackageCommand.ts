import { command, positional, string } from 'cmd-ts';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { showPackageHandler } from './showPackageHandler';

export const showPackageCommand = command({
  name: 'show',
  description: 'Show details of a specific package',
  args: {
    slug: positional({
      type: string,
      displayName: 'package',
      description: 'Package slug (e.g. backend or @my-space/backend)',
    }),
  },
  handler: async ({ slug }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await showPackageHandler({ slug }, { packmindCliHexa, exit: process.exit });
  },
});
