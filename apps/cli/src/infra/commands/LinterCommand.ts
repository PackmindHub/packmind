import {
  command,
  flag,
  option,
  optional,
  positional,
  string,
  Type,
} from 'cmd-ts';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { createRuleId, RuleId } from '@packmind/types';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { DiffMode } from '../../domain/entities/DiffMode';
import { IDELintLogger } from '../repositories/IDELintLogger';
import { HumanReadableLogger } from '../repositories/HumanReadableLogger';
import * as pathModule from 'path';
import { lintHandler, LintHandlerDependencies, Loggers } from './lintHandler';
import { logWarningConsole } from '../utils/consoleLogger';

const Logger: Type<string, Loggers> = {
  from: async (input) => {
    switch (input) {
      case 'ide':
        return Loggers.ide;
      case 'human':
        return Loggers.human;
    }
    throw new Error(
      `${input} is not a valid value for the --logger option. Expected values are: ide, human`,
    );
  },
};

const RuleID: Type<string, { standardSlug: string; ruleId: RuleId }> = {
  from: async (input) => {
    const match = input.match(/^@([^/]+)\/(.+)$/);
    if (!match) {
      throw new Error(
        'Error: Invalid --rule format. Expected format: @standard-slug/ruleId',
      );
    }
    return {
      standardSlug: match[1],
      ruleId: createRuleId(match[2]),
    };
  },
};

const DiffModeType: Type<string, DiffMode> = {
  from: async (input) => {
    switch (input) {
      case 'files':
        return DiffMode.FILES;
      case 'lines':
        return DiffMode.LINES;
    }
    throw new Error(
      `${input} is not a valid value for the --diff option. Expected values are: files, lines`,
    );
  },
};

export const lintCommand = command({
  name: 'lint',
  description: 'Lint code at the specified path',
  args: {
    path: positional({
      displayName: 'path',
      description:
        'Path to lint (e.g., . for current directory. Default is current directory)',
      type: optional(string),
    }),
    logger: option({
      long: 'logger',
      description: 'Output format (ide | human). Default is human',
      type: Logger,
      defaultValue: () => Loggers.human,
      defaultValueIsSerializable: true,
    }),
    rule: option({
      long: 'rule',
      description:
        'Specify rule in format @standard-slug/ruleId (runs active programs without --draft)',
      type: optional(RuleID),
    }),
    language: option({
      long: 'language',
      description: 'Filter detection programs by language',
      type: optional(string),
    }),
    draft: flag({
      long: 'draft',
      description: 'Use draft detection programs (requires --rule)',
    }),
    debug: flag({
      long: 'debug',
      description: 'Enable debug logging',
    }),
    continueOnError: flag({
      long: 'continue-on-error',
      description: 'Exit with status code 0 even if violations are found',
    }),
    continueOnMissingKey: flag({
      long: 'continue-on-missing-key',
      description:
        'Skip linting and exit with status code 0 if PACKMIND_API_KEY_V3 is not set',
    }),
    diff: option({
      long: 'diff',
      description:
        '[Deprecated: use --changed-files or --changed-lines] Filter violations by git diff (files | lines)',
      type: optional(DiffModeType),
    }),
    changedFiles: flag({
      long: 'changed-files',
      description: 'Only lint files that have changed',
    }),
    changedLines: flag({
      long: 'changed-lines',
      description: 'Only lint lines that have changed',
    }),
  },
  handler: async (args) => {
    if (args.changedFiles && args.changedLines) {
      throw new Error(
        'Options --changed-files and --changed-lines are mutually exclusive',
      );
    }

    if (args.diff) {
      const replacement =
        args.diff === DiffMode.FILES ? '--changed-files' : '--changed-lines';
      await logWarningConsole(
        `--diff is deprecated. Use ${replacement} instead.`,
      );
    }

    let diff = args.diff;
    if (args.changedFiles) {
      diff = DiffMode.FILES;
    } else if (args.changedLines) {
      diff = DiffMode.LINES;
    }

    const packmindLogger = new PackmindLogger(
      'PackmindCLI',
      args.debug ? LogLevel.DEBUG : LogLevel.INFO,
    );

    const deps: LintHandlerDependencies = {
      packmindCliHexa: new PackmindCliHexa(packmindLogger),
      humanReadableLogger: new HumanReadableLogger(),
      ideLintLogger: new IDELintLogger(),
      resolvePath: (targetPath: string) =>
        pathModule.isAbsolute(targetPath)
          ? targetPath
          : pathModule.resolve(process.cwd(), targetPath),
      exit: (code: number) => process.exit(code),
    };

    await lintHandler({ ...args, diff }, deps);
  },
});
