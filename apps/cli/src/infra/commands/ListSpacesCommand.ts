import { command } from 'cmd-ts';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { listSpacesHandler } from './spaces/listSpacesHandler';

export const listSpacesCommand = command({
  name: 'list',
  description: 'List available spaces in the organization',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await listSpacesHandler({
      packmindCliHexa,
      exit: process.exit,
    });
  },
});
