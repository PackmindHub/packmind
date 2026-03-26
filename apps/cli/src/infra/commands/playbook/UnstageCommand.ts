import { command, option, optional, positional, string } from 'cmd-ts';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { PlaybookLocalRepository } from '../../repositories/PlaybookLocalRepository';
import { playbookUnstageHandler } from './unstageHandler';
import { SpaceSlug } from '../customParameters/SpaceSlug';

export const unstagePlaybookCommand = command({
  name: 'unstage',
  description: 'Remove a staged change',
  args: {
    filePath: positional({
      type: string,
      displayName: 'path',
      description: 'Path to the artifact file or directory to unstage',
    }),
    space: option({
      type: optional(SpaceSlug),
      long: 'space',
      description:
        'Target space slug (required when artifact is staged for multiple spaces)',
    }),
  },
  handler: async ({ filePath, space }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);
    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(
      process.cwd(),
    );
    const repoRoot = gitRoot ?? process.cwd();
    const playbookLocalRepository = new PlaybookLocalRepository(repoRoot);

    await playbookUnstageHandler({
      packmindCliHexa,
      filePath,
      spaceSlug: space,
      exit: process.exit,
      getCwd: () => process.cwd(),
      playbookLocalRepository,
    });
  },
});
