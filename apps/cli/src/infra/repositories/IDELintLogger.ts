import { LintViolation } from '../../domain/entities/LintViolation';
import { ILogger } from '../../domain/repositories/ILogger';
import { logConsole } from '../utils/consoleLogger';

export class IDELintLogger implements ILogger {
  async logViolations(violations: LintViolation[]): Promise<void> {
    for (const violation of violations) {
      await this.logViolation(violation);
    }
  }

  async logViolation(violation: LintViolation): Promise<void> {
    for (const { line, character, standard, rule } of violation.violations) {
      logConsole(
        `${violation.file}:${line}:${character}:error:@${standard}/${rule}`,
      );
    }
  }
}
