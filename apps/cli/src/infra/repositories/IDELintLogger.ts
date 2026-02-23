import { DetectionSeverity } from '@packmind/types';
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
    violation.violations.forEach(
      ({ line, character, standard, rule, severity }) => {
        const label =
          severity === DetectionSeverity.WARNING ? 'warning' : 'error';
        logConsole(
          `${violation.file}:${line}:${character}:${label}:@${standard}/${rule}`,
        );
      },
    );
  }
}
