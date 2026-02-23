import { DetectionSeverity } from '@packmind/types';
import { LintViolation } from '../../domain/entities/LintViolation';
import { IDELintLogger } from './IDELintLogger';
import * as consoleLogger from '../utils/consoleLogger';

jest.mock('../utils/consoleLogger', () => ({
  logConsole: jest.fn(),
}));

describe('IDELintLogger', () => {
  let logger: IDELintLogger;

  beforeEach(() => {
    logger = new IDELintLogger();
    jest.clearAllMocks();
  });

  describe('logViolation', () => {
    describe('when violation has error severity', () => {
      it('outputs error label', () => {
        const violation: LintViolation = {
          file: '/path/to/file.ts',
          violations: [
            {
              line: 10,
              character: 5,
              rule: 'rule1',
              standard: 'standard1',
              severity: DetectionSeverity.ERROR,
            },
          ],
        };

        logger.logViolation(violation);

        expect(consoleLogger.logConsole).toHaveBeenCalledWith(
          '/path/to/file.ts:10:5:error:@standard1/rule1',
        );
      });
    });

    describe('when violation has warning severity', () => {
      it('outputs warning label', () => {
        const violation: LintViolation = {
          file: '/path/to/file.ts',
          violations: [
            {
              line: 10,
              character: 5,
              rule: 'rule1',
              standard: 'standard1',
              severity: DetectionSeverity.WARNING,
            },
          ],
        };

        logger.logViolation(violation);

        expect(consoleLogger.logConsole).toHaveBeenCalledWith(
          '/path/to/file.ts:10:5:warning:@standard1/rule1',
        );
      });
    });

    describe('when violation has undefined severity', () => {
      it('outputs error label', () => {
        const violation: LintViolation = {
          file: '/path/to/file.ts',
          violations: [
            {
              line: 10,
              character: 5,
              rule: 'rule1',
              standard: 'standard1',
              severity: undefined,
            },
          ],
        };

        logger.logViolation(violation);

        expect(consoleLogger.logConsole).toHaveBeenCalledWith(
          '/path/to/file.ts:10:5:error:@standard1/rule1',
        );
      });
    });
  });
});
