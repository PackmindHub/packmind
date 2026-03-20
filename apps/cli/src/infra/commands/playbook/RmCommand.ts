import { command, positional, string } from 'cmd-ts';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PlaybookLocalRepository } from '../../repositories/PlaybookLocalRepository';
import { LockFileRepository } from '../../repositories/LockFileRepository';
import { playbookRmHandler } from './rmHandler';

export const rmPlaybookCommand = command({
  name: 'rm',
  description: 'Stage an artifact for removal',
  args: {
    filePath: positional({
      type: string,
      displayName: 'path',
      description: 'Path to the artifact file or directory to remove',
    }),
  },
  handler: async ({ filePath }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);
    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(
      process.cwd(),
    );
    const repoRoot = gitRoot ?? process.cwd();
    const playbookLocalRepository = new PlaybookLocalRepository(repoRoot);
    const lockFileRepository = new LockFileRepository();

    await playbookRmHandler({
      packmindCliHexa,
      filePath,
      exit: process.exit,
      getCwd: () => process.cwd(),
      playbookLocalRepository,
      lockFileRepository,
    });
  },
});
