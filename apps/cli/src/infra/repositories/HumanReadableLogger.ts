import { LintViolation } from '../../domain/entities/LintViolation';
import { ILogger } from '../../domain/repositories/ILogger';
import {
  logErrorConsole,
  logSuccessConsole,
  formatFilePath,
  formatError,
  formatBold,
  logConsole,
} from '../utils/consoleLogger';

export class HumanReadableLogger implements ILogger {
  async logViolations(violations: LintViolation[]): Promise<void> {
    for (const violation of violations) {
      await this.logViolation(violation);
    }

    if (violations.length > 0) {
      const totalViolationCount = violations.reduce(
        (acc, violation) => acc + violation.violations.length,
        0,
      );
      await logErrorConsole(
        `❌ Found ${await formatBold(String(totalViolationCount))} violation(s) in ${await formatBold(String(violations.length))} file(s)`,
      );
    } else {
      await logSuccessConsole(`✅ No violations found`);
    }
  }

  async logViolation(violation: LintViolation): Promise<void> {
    logConsole(await formatFilePath(violation.file));
    for (const { line, character, standard, rule } of violation.violations) {
      logConsole(
        await formatError(
          `\t${line}:${character}\terror\t@${standard}/${rule}`,
        ),
      );
    }
  }
}
