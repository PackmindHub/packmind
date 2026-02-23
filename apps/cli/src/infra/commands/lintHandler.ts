import { DetectionSeverity, RuleId } from '@packmind/types';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { LintViolation } from '../../domain/entities/LintViolation';
import { DiffMode } from '../../domain/entities/DiffMode';
import { IDELintLogger } from '../repositories/IDELintLogger';
import { HumanReadableLogger } from '../repositories/HumanReadableLogger';
import { CommunityEditionError } from '../../domain/errors/CommunityEditionError';
import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';
import { logInfoConsole, logWarningConsole } from '../utils/consoleLogger';

const SEVERITY_LEVELS: Record<DetectionSeverity, number> = {
  [DetectionSeverity.WARNING]: 0,
  [DetectionSeverity.ERROR]: 1,
};

export enum Loggers {
  ide = 'ide',
  human = 'human',
}

export type LintHandlerArgs = {
  path?: string;
  draft: boolean;
  rule?: { standardSlug: string; ruleId: RuleId };
  debug: boolean;
  language?: string;
  logger: Loggers;
  continueOnError: boolean;
  continueOnMissingKey: boolean;
  diff?: DiffMode;
  level?: DetectionSeverity;
};

export type LintHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  humanReadableLogger: HumanReadableLogger;
  ideLintLogger: IDELintLogger;
  resolvePath: (targetPath: string) => string;
  exit: (code: number) => void;
};

function isNotLoggedInError(error: unknown): boolean {
  return error instanceof NotLoggedInError;
}

export async function lintHandler(
  args: LintHandlerArgs,
  deps: LintHandlerDependencies,
): Promise<void> {
  const {
    path,
    draft,
    rule,
    language,
    logger,
    continueOnError,
    continueOnMissingKey,
    diff,
    level,
  } = args;
  const {
    packmindCliHexa,
    humanReadableLogger,
    ideLintLogger,
    resolvePath,
    exit,
  } = deps;

  if (draft && !rule) {
    throw new Error('option --rule is required to use --draft mode');
  }

  const startedAt = Date.now();
  const targetPath = path ?? '.';
  const absolutePath = resolvePath(targetPath);

  if (diff) {
    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(absolutePath);
    if (!gitRoot) {
      throw new Error(
        'The --changed-files and --changed-lines options require the project to be in a Git repository',
      );
    }
  }

  let violations: LintViolation[] = [];

  try {
    if (rule) {
      const result = await packmindCliHexa.lintFilesAgainstRule({
        path: targetPath,
        draftMode: draft,
        standardSlug: rule?.standardSlug,
        ruleId: rule?.ruleId,
        language,
        diffMode: diff,
      });
      violations = result.violations;
    } else {
      const stopDirectory =
        await packmindCliHexa.tryGetGitRepositoryRoot(absolutePath);

      const hierarchicalConfig = await packmindCliHexa.readHierarchicalConfig(
        absolutePath,
        stopDirectory,
      );

      if (!hierarchicalConfig.hasConfigs) {
        throw new Error(
          'No packmind.json config found. Run `packmind-cli install <some-package>` first to set up linting.',
        );
      }

      const result = await packmindCliHexa.lintFilesFromConfig({
        path: absolutePath,
        diffMode: diff,
      });
      violations = result.violations;
    }
  } catch (error) {
    if (isNotLoggedInError(error) && continueOnMissingKey) {
      logWarningConsole(
        'Warning: Not logged in to Packmind, linting is skipped. Run `packmind-cli login` to authenticate.',
      );
      exit(0);
      return;
    }
    if (error instanceof CommunityEditionError) {
      logInfoConsole(`packmind-cli ${error.message}`);
      logInfoConsole('Linting skipped.');
      exit(0);
      return;
    }
    throw error;
  }

  const filteredViolations = level
    ? violations
        .map((v) => ({
          ...v,
          violations: v.violations.filter(
            (d) => SEVERITY_LEVELS[d.severity] >= SEVERITY_LEVELS[level],
          ),
        }))
        .filter((v) => v.violations.length > 0)
    : violations;

  (logger === Loggers.ide ? ideLintLogger : humanReadableLogger).logViolations(
    filteredViolations,
  );

  const durationSeconds = (Date.now() - startedAt) / 1000;
  logInfoConsole(`Lint completed in ${durationSeconds.toFixed(2)}s`);

  const hasErrors = filteredViolations.some((v) =>
    v.violations.some((d) => d.severity === DetectionSeverity.ERROR),
  );

  if (hasErrors && !continueOnError) {
    exit(1);
  } else {
    exit(0);
  }
}
