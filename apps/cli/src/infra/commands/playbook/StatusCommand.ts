import { readFileSync } from 'fs';
import { command } from 'cmd-ts';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PlaybookLocalRepository } from '../../repositories/PlaybookLocalRepository';
import { LockFileRepository } from '../../repositories/LockFileRepository';
import { listDirectoryFiles } from '../../utils/listDirectoryFiles';
import { playbookStatusHandler } from './statusHandler';

export const statusPlaybookCommand = command({
  name: 'status',
  description: 'Show staged and untracked changes',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);
    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(
      process.cwd(),
    );
    const repoRoot = gitRoot ?? process.cwd();
    const playbookLocalRepository = new PlaybookLocalRepository(repoRoot);
    const lockFileRepository = new LockFileRepository();

    await playbookStatusHandler({
      packmindCliHexa,
      playbookLocalRepository,
      lockFileRepository,
      cwd: process.cwd(),
      exit: process.exit,
      readFile: (p) => readFileSync(p, 'utf-8'),
      listDirectoryFiles,
    });
  },
});
