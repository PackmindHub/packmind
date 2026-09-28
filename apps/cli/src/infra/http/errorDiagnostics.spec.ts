import {
  buildErrorDiagnostics,
  createDiagnosticError,
  formatErrorDiagnostics,
} from './errorDiagnostics';
import { setDebug } from '../utils/debugMode';
import { appendErrorLog } from '../utils/errorLog';

jest.mock('../utils/errorLog');

const mockAppendErrorLog = appendErrorLog as jest.MockedFunction<
  typeof appendErrorLog
>;

describe('formatErrorDiagnostics', () => {
  const context = {
    method: 'GET',
    url: 'https://api.packmind.com/api/v0/skills',
  };

  const buildFetchFailure = () => {
    const cause: Error & { code?: string; syscall?: string } = new Error(
      'getaddrinfo ENOTFOUND api.packmind.com',
    );
    cause.code = 'ENOTFOUND';
    cause.syscall = 'getaddrinfo';
    const failure: TypeError & { cause?: unknown } = new TypeError(
      'fetch failed',
    );
    failure.cause = cause;
    return failure;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    setDebug(false);
  });

  describe('when debug mode is off', () => {
    it('returns nothing', () => {
      expect(formatErrorDiagnostics(buildFetchFailure(), context)).toBe('');
    });
  });

  describe('when debug mode is on', () => {
    let output: string;

    beforeEach(() => {
      setDebug(true);
      output = formatErrorDiagnostics(buildFetchFailure(), context);
    });

    it('names the request that failed', () => {
      expect(output).toContain(
        '  Request: GET https://api.packmind.com/api/v0/skills',
      );
    });

    it('reports the outer error', () => {
      expect(output).toContain('    1. TypeError: fetch failed');
    });

    it('reports the underlying cause with its code', () => {
      expect(output).toContain(
        '    2. Error: getaddrinfo ENOTFOUND api.packmind.com (code=ENOTFOUND, syscall=getaddrinfo)',
      );
    });

    it('includes a stack', () => {
      expect(output).toContain('  Stack:');
    });
  });

  describe('when no request context is given', () => {
    beforeEach(() => {
      setDebug(true);
    });

    it('omits the request line', () => {
      expect(formatErrorDiagnostics(new Error('boom'))).not.toContain(
        'Request:',
      );
    });

    it('still reports the error', () => {
      expect(formatErrorDiagnostics(new Error('boom'))).toContain(
        '    1. Error: boom',
      );
    });
  });

  describe('when the cause chain loops back on itself', () => {
    beforeEach(() => {
      setDebug(true);
    });

    it('stops rather than looping forever', () => {
      const outer: Error & { cause?: unknown } = new Error('outer');
      const inner: Error & { cause?: unknown } = new Error('inner');
      outer.cause = inner;
      inner.cause = outer;

      expect(formatErrorDiagnostics(outer)).toContain('    2. Error: inner');
    });
  });

  describe('when the thrown value is not an error', () => {
    beforeEach(() => {
      setDebug(true);
    });

    it('reports it as a string', () => {
      expect(formatErrorDiagnostics('boom')).toContain('    1. boom');
    });
  });

  describe('createDiagnosticError', () => {
    describe('when debug mode is off', () => {
      it('keeps the message plain', () => {
        expect(
          createDiagnosticError('Request failed', buildFetchFailure(), context)
            .message,
        ).toBe('Request failed');
      });

      it('still carries the original error as its cause', () => {
        const cause = buildFetchFailure();

        expect(
          (
            createDiagnosticError('Request failed', cause) as Error & {
              cause?: unknown;
            }
          ).cause,
        ).toBe(cause);
      });
    });

    describe('when debug mode is on', () => {
      it('appends the diagnostics to the message', () => {
        setDebug(true);

        expect(
          createDiagnosticError('Request failed', buildFetchFailure(), context)
            .message,
        ).toContain('Debug diagnostics:');
      });
    });
  });

  describe('buildErrorDiagnostics', () => {
    describe('when debug mode is off', () => {
      it('still builds the block, so the log can record it', () => {
        expect(buildErrorDiagnostics(buildFetchFailure(), context)).toContain(
          '    2. Error: getaddrinfo ENOTFOUND api.packmind.com (code=ENOTFOUND, syscall=getaddrinfo)',
        );
      });
    });
  });

  describe('when an error is created without --debug', () => {
    beforeEach(() => {
      createDiagnosticError('Request failed', buildFetchFailure(), context);
    });

    it('records the message in the error log', () => {
      expect(mockAppendErrorLog.mock.calls[0][0].message).toBe(
        'Request failed',
      );
    });

    it('records the diagnostics in the error log', () => {
      expect(mockAppendErrorLog.mock.calls[0][0].diagnostics).toContain(
        '  Request: GET https://api.packmind.com/api/v0/skills',
      );
    });
  });

  describe('when an error is created under --debug', () => {
    it('still records it once in the error log', () => {
      setDebug(true);

      createDiagnosticError('Request failed', buildFetchFailure(), context);

      expect(mockAppendErrorLog).toHaveBeenCalledTimes(1);
    });
  });
});
