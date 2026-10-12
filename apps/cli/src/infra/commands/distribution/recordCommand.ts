import { command } from 'cmd-ts';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { ConfigFileRepository } from '../../repositories/ConfigFileRepository';
import { LockFileRepository } from '../../repositories/LockFileRepository';
import { recordDistributionHandler } from './recordDistributionHandler';

export const recordCommand = command({
  name: 'record',
  description:
    'Record in Packmind what the packmind-lock.json files in and below the current directory say each target runs, on the tracked branch',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);

    await recordDistributionHandler({
      baseDirectory: process.cwd(),
      packmindCliHexa: new PackmindCliHexa(packmindLogger),
      lockFileRepository: new LockFileRepository(),
      configFileRepository: new ConfigFileRepository(),
      exit: process.exit,
    });
  },
});
