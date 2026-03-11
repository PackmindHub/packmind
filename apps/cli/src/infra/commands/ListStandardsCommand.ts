import { command, flag } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { listStandardsHandler } from './listStandardsHandler';
import { LockFileRepository } from '../repositories/LockFileRepository';

export const listStandardsCommand = command({
  name: 'list',
  description: 'List available coding standards',
  args: {
    files: flag({
      long: 'files',
      description: 'Show tracked file paths from lock file',
    }),
  },
  handler: async ({ files }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await listStandardsHandler({
      packmindCliHexa,
      exit: process.exit,
      log: console.log,
      error: console.error,
      files,
      lockFileRepository: new LockFileRepository(),
      getCwd: () => process.cwd(),
    });
  },
});
