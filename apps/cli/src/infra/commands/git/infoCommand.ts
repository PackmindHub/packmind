import { command } from 'cmd-ts';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { trackingInfoHandler } from '../trackingInfoHandler';

export const infoCommand = command({
  name: 'info',
  description:
    'Show whether Packmind tracks the current repository, and on which branch',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await trackingInfoHandler({
      baseDirectory: process.cwd(),
      getTrackingInfo: packmindCliHexa.getTrackingInfo.bind(packmindCliHexa),
    });
  },
});
