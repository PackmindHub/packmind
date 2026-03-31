import { readFileSync, writeFileSync, unlinkSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { command, flag, option, optional, string } from 'cmd-ts';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PlaybookLocalRepository } from '../../repositories/PlaybookLocalRepository';
import { LockFileRepository } from '../../repositories/LockFileRepository';
import { playbookSubmitHandler } from './submitHandler';

function openEditorForMessage(prefill: string): string | null {
  const editor = process.env.VISUAL || process.env.EDITOR || 'vi';
  const tmpFile = join(tmpdir(), `packmind-submit-${Date.now()}.md`);

  try {
    writeFileSync(tmpFile, prefill, 'utf-8');
    execSync(`${editor} "${tmpFile}"`, { stdio: 'inherit' });
    const content = readFileSync(tmpFile, 'utf-8');

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

export const submitPlaybookCommand = command({
  name: 'submit',
  description: 'Submit staged changes as proposals',
  args: {
    message: option({
      type: optional(string),
      long: 'message',
      short: 'm',
      description: 'Message describing the intent behind the proposed changes',
    }),
    noReview: flag({
      long: 'no-review',
      description:
        'Apply changes directly without creating proposals for review',
    }),
  },
  handler: async ({ message, noReview }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);
    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(
      process.cwd(),
    );
    const repoRoot = gitRoot ?? process.cwd();
    const playbookLocalRepository = new PlaybookLocalRepository(repoRoot);
    const lockFileRepository = new LockFileRepository();

    await playbookSubmitHandler({
      packmindCliHexa,
      playbookLocalRepository,
      lockFileRepository,
      cwd: process.cwd(),
      exit: process.exit,
      message,
      noReview,
      openEditor: (prefill: string) => openEditorForMessage(prefill),
      unlinkSync: (p: string) => unlinkSync(p),
      rmSync: (p: string, opts?: { recursive?: boolean }) => rmSync(p, opts),
    });
  },
});
