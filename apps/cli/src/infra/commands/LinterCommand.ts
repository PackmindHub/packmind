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
import { LintViolation } from '../../domain/entities/LintViolation';
import { IDELintLogger } from '../repositories/IDELintLogger';
import { HumanReadableLogger } from '../repositories/HumanReadableLogger';
import * as pathModule from 'path';

enum Loggers {
  ide = 'ide',
  human = 'human',
}

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
  },
  handler: async ({ path, draft, rule, debug, language, logger }) => {
    if (draft && !rule) {
      throw new Error('option --rule is required to use --draft mode');
    }

    const startedAt = Date.now();
    const packmindLogger = new PackmindLogger(
      'PackmindCLI',
      debug ? LogLevel.DEBUG : LogLevel.INFO,
    );
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    const targetPath = path ?? '.';
    const hasArguments = !!(draft || rule || language);

    // Convert to absolute path for config detection
    const absolutePath = pathModule.isAbsolute(targetPath)
      ? targetPath
      : pathModule.resolve(process.cwd(), targetPath);

    // Determine linting mode and targets
    let useLocalLinting = false;
    let lintTargets: string[] = [];

    if (!hasArguments) {
      const stopDirectory =
        await packmindCliHexa.tryGetGitRepositoryRoot(absolutePath);

      // Check if there's a config at the root level
      const hierarchicalConfig = await packmindCliHexa.readHierarchicalConfig(
        absolutePath,
        stopDirectory,
      );

      if (hierarchicalConfig.hasConfigs) {
        useLocalLinting = true;

        // Start with the root as a target if it has a direct config
        const rootConfig = await packmindCliHexa.readHierarchicalConfig(
          absolutePath,
          absolutePath,
        );
        if (rootConfig.hasConfigs) {
          lintTargets.push(absolutePath);
        }

        // Find all descendant configs (child targets)
        const descendantTargets =
          await packmindCliHexa.findDescendantConfigs(absolutePath);
        lintTargets = [...lintTargets, ...descendantTargets];

        // If no direct targets found but hierarchical config exists,
        // use the root as the only target
        if (lintTargets.length === 0) {
          lintTargets.push(absolutePath);
        }
      }
    }

    let violations: LintViolation[] = [];

    if (useLocalLinting && lintTargets.length > 0) {
      // Lint each target independently and aggregate results
      for (const target of lintTargets) {
        packmindLogger.debug(`Linting target: ${target}`);
        const result = await packmindCliHexa.lintFilesLocally({
          path: target,
        });
        violations = [...violations, ...result.violations];
      }
    } else {
      // Fall back to deployment mode
      const result = await packmindCliHexa.lintFilesInDirectory({
        path: targetPath,
        draftMode: draft,
        standardSlug: rule?.standardSlug,
        ruleId: rule?.ruleId,
        language,
      });
      violations = result.violations;
    }

    (logger === Loggers.ide
      ? new IDELintLogger()
      : new HumanReadableLogger()
    ).logViolations(violations);

    const durationSeconds = (Date.now() - startedAt) / 1000;
    console.log(`Lint completed in ${durationSeconds.toFixed(2)}s`);

    if (violations.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  },
});
