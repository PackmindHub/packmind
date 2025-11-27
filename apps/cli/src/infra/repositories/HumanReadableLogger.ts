import { LintViolation } from '../../domain/entities/LintViolation';
import { ILogger } from '../../domain/repositories/ILogger';
import {
  logErrorConsole,
  logSuccessConsole,
  formatFilePath,
  formatError,
  formatBold,
} from '../utils/consoleLogger';

export class HumanReadableLogger implements ILogger {
  logViolations(violations: LintViolation[]) {
    violations.forEach((violation) => {
      this.logViolation(violation);
    });

    if (violations.length > 0) {
      const totalViolationCount = violations.reduce(
        (acc, violation) => acc + violation.violations.length,
        0,
      );
      logErrorConsole(
        `❌ Found ${formatBold(String(totalViolationCount))} violation(s) in ${formatBold(String(violations.length))} file(s)`,
      );
    } else {
      logSuccessConsole(`✅ No violations found`);
    }
  }

  logViolation(violation: LintViolation) {
    console.log(formatFilePath(violation.file));
    violation.violations.forEach(({ line, character, standard, rule }) => {
      console.log(
        formatError(`\t${line}:${character}\terror\t@${standard}/${rule}`),
      );
    });
  }
}
