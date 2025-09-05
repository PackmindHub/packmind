import { LintViolation } from '../../domain/entities/LintViolation';
import { ILogger } from '../../domain/repositories/ILogger';

export class IDELintLogger implements ILogger {
  logViolations(violations: LintViolation[]) {
    violations.forEach((violation) => {
      this.logViolation(violation);
    });
  }

  logViolation(violation: LintViolation) {
    violation.violations.forEach(({ line, character, standard, rule }) => {
      console.log(
        `${violation.file}:${line}:${character}:error:@${standard}/${rule}`,
      );
    });
  }
}
