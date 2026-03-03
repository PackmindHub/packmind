import { readFileSync } from 'fs';
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
    positionals: restPositionals({
      type: string,
      displayName: 'args',
      description: 'Subcommand and arguments (e.g., add <path>)',
    }),
  },
  handler: async ({ submit, includeSubmitted, message, positionals }) => {
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

    await diffArtefactsHandler({
      packmindCliHexa,
      exit: process.exit,
      getCwd: () => process.cwd(),
      log: console.log,
      error: console.error,
      submit,
      includeSubmitted,
      message,
    });
  },
});
