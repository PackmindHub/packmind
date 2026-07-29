import { readFileSync } from 'fs';
import { command, option, optional, restPositionals, string } from 'cmd-ts';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PlaybookLocalRepository } from '../../repositories/PlaybookLocalRepository';
import { LockFileRepository } from '../../repositories/LockFileRepository';
import { readSkillDirectory } from '../../utils/readSkillDirectory';
import { playbookAddHandler } from './addHandler';
import { SpaceSlug } from '../customParameters/SpaceSlug';

export const addPlaybookCommand = command({
  name: 'add',
  description: 'Stage one or more local artifact changes',
  args: {
    filePaths: restPositionals({
      type: string,
      displayName: 'paths',
      description: 'Paths to the artifact files or directories to stage',
    }),
    space: option({
      type: optional(SpaceSlug),
      long: 'space',
      description: 'Target space slug',
    }),
  },
  handler: async ({ filePaths, space }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);
    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(
      process.cwd(),
    );
    const repoRoot = gitRoot ?? process.cwd();
    const playbookLocalRepository = new PlaybookLocalRepository(repoRoot);
    const lockFileRepository = new LockFileRepository();

    await playbookAddHandler({
      packmindCliHexa,
      filePaths,
      spaceSlug: space,
      exit: process.exit,
      cwd: process.cwd(),
      readFile: (p) => readFileSync(p, 'utf-8'),
      readSkillDirectory,
      playbookLocalRepository,
      lockFileRepository,
    });
  },
});
