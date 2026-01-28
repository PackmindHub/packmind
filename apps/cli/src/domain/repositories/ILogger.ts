import { LintViolation } from '../entities/LintViolation';

export interface ILogger {
  logViolations: (violations: LintViolation[]) => Promise<void>;
  logViolation: (violation: LintViolation) => Promise<void>;
}
