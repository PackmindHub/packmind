import { DetectionSeverity } from '@packmind/types';
import { LintViolation } from '../../domain/entities/LintViolation';
import { ILogger } from '../../domain/repositories/ILogger';
import {
  logErrorConsole,
  logWarningConsole,
  logSuccessConsole,
  formatFilePath,
  formatError,
  formatWarning,
  formatBold,
  logConsole,
} from '../utils/consoleLogger';

export class HumanReadableLogger implements ILogger {
  logViolations(violations: LintViolation[]) {
    violations.forEach((violation) => {
      this.logViolation(violation);
    });

    if (violations.length === 0) {
      logSuccessConsole(`✅ No violations found`);
      return;
    }

    const allDetails = violations.flatMap((v) => v.violations);
    const errorCount = allDetails.filter(
      (d) => d.severity === DetectionSeverity.ERROR,
    ).length;
    const warningCount = allDetails.filter(
      (d) => d.severity === DetectionSeverity.WARNING,
    ).length;

    if (errorCount > 0) {
      logErrorConsole(
        `❌  Found ${formatBold(String(errorCount))} error(s) in ${formatBold(String(violations.length))} file(s)`,
      );
    }
    if (warningCount > 0) {
      logWarningConsole(
        `⚠️ Found ${formatBold(String(warningCount))} warning(s) in ${formatBold(String(violations.length))} file(s)`,
      );
    }
  }

  logViolation(violation: LintViolation) {
    logConsole(formatFilePath(violation.file));
    violation.violations.forEach(
      ({ line, character, standard, rule, severity }) => {
        const label =
          severity === DetectionSeverity.WARNING ? 'warning' : 'error';
        const format =
          severity === DetectionSeverity.WARNING ? formatWarning : formatError;
        logConsole(
          format(`\t${line}:${character}\t${label}\t@${standard}/${rule}`),
        );
      },
    );
  }
}
