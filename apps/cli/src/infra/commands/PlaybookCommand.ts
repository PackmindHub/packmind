import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { command, option, optional, restPositionals, string } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PlaybookLocalRepository } from '../repositories/PlaybookLocalRepository';
import { LockFileRepository } from '../repositories/LockFileRepository';
import { playbookAddHandler } from './playbookAddHandler';
import { playbookUnstageHandler } from './playbookUnstageHandler';
import { playbookStatusHandler } from './playbookStatusHandler';
import { playbookSubmitHandler } from './playbookSubmitHandler';
import { readSkillDirectory } from '../utils/readSkillDirectory';
import { logConsole, logErrorConsole } from '../utils/consoleLogger';

export const playbookCommand = command({
  name: 'playbook',
  description: `Track local changes to deployed Packmind artifacts

Subcommands:
  add [--space <slug>] <path>   Stage a local artifact change
  unstage <path>   Remove a staged change
  status           Show staged and untracked changes
  submit [-m msg]  Submit staged changes as proposals`,
  args: {
    positionals: restPositionals({
      type: string,
      displayName: 'args',
      description:
        'Subcommand and arguments (e.g., add <path>, unstage <path>)',
    }),
    message: option({
      type: optional(string),
      long: 'message',
      short: 'm',
      description: 'Submit message (used with submit subcommand)',
    }),
    space: option({
      type: optional(string),
      long: 'space',
      description: 'Target space slug (used with add subcommand)',
    }),
  },
  handler: async ({ positionals, message, space }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(
      process.cwd(),
    );
    const repoRoot = gitRoot ?? process.cwd();
    const playbookLocalRepository = new PlaybookLocalRepository(repoRoot);

    if (positionals[0] === 'add') {
      const lockFileRepository = new LockFileRepository();
      await playbookAddHandler({
        packmindCliHexa,
        filePath: positionals[1],
        spaceSlug: space,
        exit: process.exit,
        getCwd: () => process.cwd(),
        readFile: (p) => readFileSync(p, 'utf-8'),
        readSkillDirectory,
        playbookLocalRepository,
        lockFileRepository,
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

    if (positionals[0] === 'status') {
      const lockFileRepository = new LockFileRepository();
      await playbookStatusHandler({
        packmindCliHexa,
        playbookLocalRepository,
        lockFileRepository,
        cwd: process.cwd(),
        exit: process.exit,
        readFile: (p) => readFileSync(p, 'utf-8'),
      });
      return;
    }

    if (positionals[0] === 'submit') {
      const lockFileRepository = new LockFileRepository();

      await playbookSubmitHandler({
        packmindCliHexa,
        playbookLocalRepository,
        lockFileRepository,
        cwd: process.cwd(),
        exit: process.exit,
        message,
        openEditor: (prefill: string) => openEditorForMessage(prefill),
      });
      return;
    }

    if (positionals[0]) {
      logErrorConsole(`Unknown subcommand: ${positionals[0]}`);
    }

    logConsole('Usage: packmind playbook <subcommand>');
    logConsole('');
    logConsole('Subcommands:');
    logConsole('  add [--space <slug>] <path>   Stage a local artifact change');
    logConsole('  unstage <path>   Remove a staged change');
    logConsole('  status           Show staged and untracked changes');
    logConsole('  submit [-m msg]  Submit staged changes as proposals');
  },
});

function openEditorForMessage(prefill: string): string | null {
  const editor = process.env.VISUAL || process.env.EDITOR || 'vi';
  const tmpFile = join(tmpdir(), `packmind-submit-${Date.now()}.md`);

  try {
    writeFileSync(tmpFile, prefill, 'utf-8');
    execSync(`${editor} "${tmpFile}"`, { stdio: 'inherit' });
    const content = readFileSync(tmpFile, 'utf-8');

    // Strip comment lines and trim
    const stripped = content
      .split('\n')
      .filter((line) => !line.startsWith('#'))
      .join('\n')
      .trim();

    return stripped || null;
  } catch {
    return null;
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }
}
