import { LintViolation } from '../entities/LintViolation';

export interface ILogger {
  logViolations: (violations: LintViolation[]) => void;
  logViolation: (violation: LintViolation) => void;
}
