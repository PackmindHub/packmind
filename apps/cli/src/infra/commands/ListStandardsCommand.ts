import { command, option, optional } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { listStandardsHandler } from './standards/listStandardsHandler';
import { SpaceSlug } from './customParameters/SpaceSlug';

export const listStandardsCommand = command({
  name: 'list',
  description: 'List available coding standards',
  args: {
    space: option({
      type: optional(SpaceSlug),
      long: 'space',
      description: 'Filter standards by space slug',
    }),
  },
  handler: async ({ space }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await listStandardsHandler(
      { space },
      {
        packmindCliHexa,
        exit: process.exit,
      },
    );
  },
});
