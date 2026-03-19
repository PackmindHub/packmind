import { readFileSync } from 'fs';
import { command, option, optional, positional, string } from 'cmd-ts';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PlaybookLocalRepository } from '../../repositories/PlaybookLocalRepository';
import { LockFileRepository } from '../../repositories/LockFileRepository';
import { readSkillDirectory } from '../../utils/readSkillDirectory';
import { playbookAddHandler } from './addHandler';

export const addPlaybookCommand = command({
  name: 'add',
  description: 'Stage a local artifact change',
  args: {
    filePath: positional({
      type: string,
      displayName: 'path',
      description: 'Path to the artifact file or directory to stage',
    }),
    space: option({
      type: optional(string),
      long: 'space',
      description: 'Target space slug',
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
    const lockFileRepository = new LockFileRepository();

    await playbookAddHandler({
      packmindCliHexa,
      filePath,
      spaceSlug: space,
      exit: process.exit,
      getCwd: () => process.cwd(),
      readFile: (p) => readFileSync(p, 'utf-8'),
      readSkillDirectory,
      playbookLocalRepository,
      lockFileRepository,
    });
  },
});
