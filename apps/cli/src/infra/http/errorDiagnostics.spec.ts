import {
  buildErrorDiagnostics,
  createDiagnosticError,
} from './errorDiagnostics';
import { appendErrorLog } from '../utils/errorLog';

jest.mock('../utils/errorLog');

const mockAppendErrorLog = appendErrorLog as jest.MockedFunction<
  typeof appendErrorLog
>;

describe('errorDiagnostics', () => {
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

  describe('buildErrorDiagnostics', () => {
    let output: string;

    beforeEach(() => {
      output = buildErrorDiagnostics(buildFetchFailure(), context);
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

    describe('when no request context is given', () => {
      it('omits the request line', () => {
        expect(buildErrorDiagnostics(new Error('boom'))).not.toContain(
          'Request:',
        );
      });

      it('still reports the error', () => {
        expect(buildErrorDiagnostics(new Error('boom'))).toContain(
          '    1. Error: boom',
        );
      });
    });

    describe('when the cause chain loops back on itself', () => {
      it('stops rather than looping forever', () => {
        const outer: Error & { cause?: unknown } = new Error('outer');
        const inner: Error & { cause?: unknown } = new Error('inner');
        outer.cause = inner;
        inner.cause = outer;

        expect(buildErrorDiagnostics(outer)).toContain('    2. Error: inner');
      });
    });

    describe('when the thrown value is not an error', () => {
      it('reports it as a string', () => {
        expect(buildErrorDiagnostics('boom')).toContain('    1. boom');
      });
    });
  });

  describe('createDiagnosticError', () => {
    let error: Error;

    beforeEach(() => {
      error = createDiagnosticError(
        'Request failed',
        buildFetchFailure(),
        context,
      );
    });

    it('keeps the console message to the one line a user can act on', () => {
      expect(error.message).toBe('Request failed');
    });

    it('carries the original error as its cause', () => {
      expect((error as Error & { cause?: unknown }).cause).toBeInstanceOf(
        TypeError,
      );
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
});
