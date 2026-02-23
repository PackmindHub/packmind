import { DetectionSeverity } from '@packmind/types';
import { LintViolation } from '../../domain/entities/LintViolation';
import { HumanReadableLogger } from './HumanReadableLogger';
import * as consoleLogger from '../utils/consoleLogger';

jest.mock('../utils/consoleLogger', () => ({
  logErrorConsole: jest.fn(),
  logWarningConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logConsole: jest.fn(),
  formatFilePath: jest.fn((text: string) => text),
  formatError: jest.fn((text: string) => text),
  formatWarning: jest.fn((text: string) => text),
  formatBold: jest.fn((text: string) => text),
}));

describe('HumanReadableLogger', () => {
  let logger: HumanReadableLogger;

  beforeEach(() => {
    logger = new HumanReadableLogger();
    jest.clearAllMocks();
  });

  describe('logViolation', () => {
    describe('when violation has error severity', () => {
      beforeEach(() => {
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
      });

      it('formats with error styling', () => {
        expect(consoleLogger.formatError).toHaveBeenCalledWith(
          expect.stringContaining('error'),
        );
      });
    });

    describe('when violation has warning severity', () => {
      beforeEach(() => {
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
      });

      it('formats with warning styling', () => {
        expect(consoleLogger.formatWarning).toHaveBeenCalledWith(
          expect.stringContaining('warning'),
        );
      });
    });
  });

  describe('logViolations', () => {
    describe('when no violations', () => {
      it('logs success message', () => {
        logger.logViolations([]);

        expect(consoleLogger.logSuccessConsole).toHaveBeenCalled();
      });
    });

    describe('when violations contain only errors', () => {
      beforeEach(() => {
        const violations: LintViolation[] = [
          {
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
          },
        ];

        logger.logViolations(violations);
      });

      it('logs error summary with error count', () => {
        expect(consoleLogger.logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('1'),
        );
      });
    });

    describe('when violations contain only warnings', () => {
      beforeEach(() => {
        const violations: LintViolation[] = [
          {
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
          },
        ];

        logger.logViolations(violations);
      });

      it('logs warning summary', () => {
        expect(consoleLogger.logWarningConsole).toHaveBeenCalledWith(
          expect.stringContaining('1'),
        );
      });

      it('does not log error summary', () => {
        expect(consoleLogger.logErrorConsole).not.toHaveBeenCalled();
      });
    });

    describe('when violations contain both errors and warnings', () => {
      beforeEach(() => {
        const violations: LintViolation[] = [
          {
            file: '/path/to/file.ts',
            violations: [
              {
                line: 10,
                character: 5,
                rule: 'error-rule',
                standard: 'standard1',
                severity: DetectionSeverity.ERROR,
              },
              {
                line: 20,
                character: 5,
                rule: 'warning-rule',
                standard: 'standard1',
                severity: DetectionSeverity.WARNING,
              },
            ],
          },
        ];

        logger.logViolations(violations);
      });

      it('logs error summary', () => {
        expect(consoleLogger.logErrorConsole).toHaveBeenCalled();
      });

      it('logs warning summary', () => {
        expect(consoleLogger.logWarningConsole).toHaveBeenCalled();
      });
    });

    describe('when errors and warnings are in separate files', () => {
      beforeEach(() => {
        const violations: LintViolation[] = [
          {
            file: '/path/to/error-file.ts',
            violations: [
              {
                line: 10,
                character: 5,
                rule: 'error-rule',
                standard: 'standard1',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
          {
            file: '/path/to/warning-file.ts',
            violations: [
              {
                line: 20,
                character: 5,
                rule: 'warning-rule',
                standard: 'standard1',
                severity: DetectionSeverity.WARNING,
              },
            ],
          },
        ];

        logger.logViolations(violations);
      });

      it('reports error file count excluding warning-only files', () => {
        expect(consoleLogger.logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('1'),
        );
      });

      it('reports warning file count excluding error-only files', () => {
        expect(consoleLogger.logWarningConsole).toHaveBeenCalledWith(
          expect.stringContaining('1'),
        );
      });
    });
  });
});
