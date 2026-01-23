import { LintViolation } from '../../domain/entities/LintViolation';
import { ILogger } from '../../domain/repositories/ILogger';
import { logConsole } from '../utils/consoleLogger';

export class IDELintLogger implements ILogger {
  logViolations(violations: LintViolation[]) {
    violations.forEach((violation) => {
      this.logViolation(violation);
    });
  }

  logViolation(violation: LintViolation) {
    violation.violations.forEach(({ line, character, standard, rule }) => {
      logConsole(
        `${violation.file}:${line}:${character}:error:@${standard}/${rule}`,
      );
    });
  }
}
