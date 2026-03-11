import { command, flag } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { listSkillsHandler } from './listSkillsHandler';
import { LockFileRepository } from '../repositories/LockFileRepository';

export const listSkillsCommand = command({
  name: 'list',
  description: 'List available skills',
  args: {
    files: flag({
      long: 'files',
      description: 'Show tracked file paths from lock file',
    }),
  },
  handler: async ({ files }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await listSkillsHandler({
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
