import { existsSync, readFileSync, rmSync, unlinkSync } from 'fs';
import {
  command,
  flag,
  option,
  optional,
  restPositionals,
  string,
} from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { diffArtefactsHandler } from './diffArtefactsHandler';
import { diffAddHandler } from './diffAddHandler';
import { diffRemoveHandler } from './diffRemoveHandler';
import { readSkillDirectory } from '../utils/readSkillDirectory';

export const diffCommand = command({
  name: 'diff',
  description:
    'Show differences between local command files and server content',
  args: {
    submit: flag({
      long: 'submit',
      description: 'Submit detected changes as change proposals',
    }),
    includeSubmitted: flag({
      long: 'include-submitted',
      description: 'Include already submitted changes in the output',
    }),
    message: option({
      long: 'message',
      short: 'm',
      description:
        'Message describing the intent behind the changes (max 1024 chars)',
      type: optional(string),
    }),
    path: option({
      long: 'path',
      short: 'p',
      description: 'Path to analyze (relative to current directory)',
      type: optional(string),
    }),
    positionals: restPositionals({
      type: string,
      displayName: 'args',
      description: 'Subcommand and arguments (e.g., add <path>, remove <path>)',
    }),
  },
  handler: async ({ submit, includeSubmitted, message, path, positionals }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    if (positionals[0] === 'add') {
      await diffAddHandler({
        packmindCliHexa,
        filePath: positionals[1],
        message,
        exit: process.exit,
        getCwd: () => process.cwd(),
        readFile: (p) => readFileSync(p, 'utf-8'),
        readSkillDirectory,
      });
      return;
    }

    if (positionals[0] === 'remove' || positionals[0] === 'rm') {
      await diffRemoveHandler({
        packmindCliHexa,
        filePath: positionals[1],
        message,
        exit: process.exit,
        getCwd: () => process.cwd(),
        existsSync: (p) => existsSync(p),
        unlinkSync: (p) => unlinkSync(p),
        rmSync: (p, opts) => rmSync(p, opts),
      });
      return;
    }

    await diffArtefactsHandler({
      packmindCliHexa,
      exit: process.exit,
      getCwd: () => process.cwd(),
      log: console.log,
      error: console.error,
      submit,
      includeSubmitted,
      message,
      path,
    });
  },
});
