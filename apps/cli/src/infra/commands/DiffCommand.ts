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
import {
  formatCommand,
  logErrorConsole,
  logInfoConsole,
} from '../utils/consoleLogger';

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

    if (submit) {
      logErrorConsole(
        'Deprecated: `packmind-cli diff --submit` has been removed',
      );
      logInfoConsole('Use the following command instead:');
      let submitCommand = `packmind-cli playbook submit`;
      if (message) {
        submitCommand = `${submitCommand} -m "${message}"`;
      }

      logInfoConsole(` ${formatCommand(submitCommand)}`);
      process.exit(1);
    }

    if (positionals[0] === 'add') {
      const addFilePath =
        path && positionals[1]
          ? `${path}/${positionals[1]}`.replace(/\/+/g, '/')
          : positionals[1];
      const addCommand = `packmind-cli playbook add ${addFilePath}`;

      logErrorConsole('Deprecated: `packmind-cli diff add` has been removed');
      logInfoConsole('Use the following command instead:');
      logInfoConsole(` ${formatCommand(addCommand)}`);
      process.exit(1);
    }

    if (positionals[0] === 'remove' || positionals[0] === 'rm') {
      const removeFilePath =
        path && positionals[1]
          ? `${path}/${positionals[1]}`.replace(/\/+/g, '/')
          : positionals[1];
      const removeCommand = `packmind-cli playbook remove ${removeFilePath}`;

      logErrorConsole(
        'Deprecated: `packmind-cli diff remove` has been removed',
      );
      logInfoConsole('Use the following command instead:');
      logInfoConsole(` ${formatCommand(removeCommand)}`);
      process.exit(1);
    }

    await diffArtefactsHandler({
      packmindCliHexa,
      exit: process.exit,
      getCwd: () => process.cwd(),
      log: console.log,
      submit,
      includeSubmitted,
      message,
      path,
    });
  },
});
