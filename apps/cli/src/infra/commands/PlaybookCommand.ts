import { readFileSync } from 'fs';
import { command, restPositionals, string } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PlaybookLocalRepository } from '../repositories/PlaybookLocalRepository';
import { playbookAddHandler } from './playbookAddHandler';
import { playbookUnstageHandler } from './playbookUnstageHandler';
import { readSkillDirectory } from '../utils/readSkillDirectory';
import { logConsole, logErrorConsole } from '../utils/consoleLogger';

export const playbookCommand = command({
  name: 'playbook',
  description: 'Track local changes to deployed Packmind artifacts',
  args: {
    positionals: restPositionals({
      type: string,
      displayName: 'args',
      description:
        'Subcommand and arguments (e.g., add <path>, unstage <path>)',
    }),
  },
  handler: async ({ positionals }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(
      process.cwd(),
    );
    const repoRoot = gitRoot ?? process.cwd();
    const playbookLocalRepository = new PlaybookLocalRepository(repoRoot);

    if (positionals[0] === 'add') {
      await playbookAddHandler({
        packmindCliHexa,
        filePath: positionals[1],
        exit: process.exit,
        getCwd: () => process.cwd(),
        readFile: (p) => readFileSync(p, 'utf-8'),
        readSkillDirectory,
        playbookLocalRepository,
      });
      return;
    }

    if (positionals[0] === 'unstage') {
      await playbookUnstageHandler({
        filePath: positionals[1],
        exit: process.exit,
        getCwd: () => process.cwd(),
        playbookLocalRepository,
      });
      return;
    }

    if (positionals[0]) {
      logErrorConsole(`Unknown subcommand: ${positionals[0]}`);
    }

    logConsole('Usage: packmind-cli playbook <subcommand>');
    logConsole('');
    logConsole('Subcommands:');
    logConsole('  add <path>       Stage a local artifact change');
    logConsole('  unstage <path>   Remove a staged change');
  },
});
