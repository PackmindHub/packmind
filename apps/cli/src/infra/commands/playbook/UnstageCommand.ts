import { command, positional, string } from 'cmd-ts';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { PlaybookLocalRepository } from '../../repositories/PlaybookLocalRepository';
import { playbookUnstageHandler } from './unstageHandler';

export const unstagePlaybookCommand = command({
  name: 'unstage',
  description: 'Remove a staged change',
  args: {
    filePath: positional({
      type: string,
      displayName: 'path',
      description: 'Path to the artifact file or directory to unstage',
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

    await playbookUnstageHandler({
      filePath,
      exit: process.exit,
      getCwd: () => process.cwd(),
      playbookLocalRepository,
    });
  },
});
