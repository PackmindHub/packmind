import { RuleId } from '@packmind/types';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { LintViolation } from '../../domain/entities/LintViolation';
import { DiffMode } from '../../domain/entities/DiffMode';
import { IDELintLogger } from '../repositories/IDELintLogger';
import { HumanReadableLogger } from '../repositories/HumanReadableLogger';

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
  diff?: DiffMode;
};

export type LintHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  humanReadableLogger: HumanReadableLogger;
  ideLintLogger: IDELintLogger;
  resolvePath: (targetPath: string) => string;
  exit: (code: number) => void;
};

export async function lintHandler(
  args: LintHandlerArgs,
  deps: LintHandlerDependencies,
): Promise<void> {
  const { path, draft, rule, language, logger, continueOnError, diff } = args;
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
  const hasArguments = !!(draft || rule || language);
  const absolutePath = resolvePath(targetPath);

  if (diff) {
    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(absolutePath);
    if (!gitRoot) {
      throw new Error(
        'The --diff option requires the project to be in a Git repository',
      );
    }
  }

  let useLocalLinting = false;

  if (!hasArguments) {
    const stopDirectory =
      await packmindCliHexa.tryGetGitRepositoryRoot(absolutePath);

    const hierarchicalConfig = await packmindCliHexa.readHierarchicalConfig(
      absolutePath,
      stopDirectory,
    );

    if (hierarchicalConfig.hasConfigs) {
      useLocalLinting = true;
    }
  }

  let violations: LintViolation[] = [];

  if (useLocalLinting) {
    const result = await packmindCliHexa.lintFilesLocally({
      path: absolutePath,
      diffMode: diff,
    });
    violations = result.violations;
  } else {
    const result = await packmindCliHexa.lintFilesInDirectory({
      path: targetPath,
      draftMode: draft,
      standardSlug: rule?.standardSlug,
      ruleId: rule?.ruleId,
      language,
      diffMode: diff,
    });
    violations = result.violations;
  }

  (logger === Loggers.ide ? ideLintLogger : humanReadableLogger).logViolations(
    violations,
  );

  const durationSeconds = (Date.now() - startedAt) / 1000;
  console.log(`Lint completed in ${durationSeconds.toFixed(2)}s`);

  if (violations.length > 0 && !continueOnError) {
    exit(1);
  } else {
    exit(0);
  }
}
