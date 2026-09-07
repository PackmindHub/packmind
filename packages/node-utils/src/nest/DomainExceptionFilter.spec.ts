import {
  ArgumentsHost,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  CATCH_WATERMARK,
  FILTER_CATCH_EXCEPTIONS,
} from '@nestjs/common/constants';
import 'reflect-metadata';
import { stubLogger } from '@packmind/test-utils';
import {
  DomainError,
  DomainErrorDetails,
  DomainErrorKind,
} from '@packmind/types';
import { DomainExceptionFilter } from './DomainExceptionFilter';

class ForbiddenTestError extends DomainError {
  readonly kind: DomainErrorKind = 'forbidden';
  readonly reason = 'test_forbidden';

  constructor(message: string, details?: DomainErrorDetails) {
    super(message, details);
  }
}

class NotFoundTestError extends DomainError {
  readonly kind: DomainErrorKind = 'not_found';
  readonly reason = 'test_not_found';

  constructor(message: string, details?: DomainErrorDetails) {
    super(message, details);
  }
}

type ResponseStub = {
  headersSent: boolean;
  status: jest.Mock;
  json: jest.Mock;
  end: jest.Mock;
};

const makeResponse = (): ResponseStub => {
  const response = {
    headersSent: false,
    status: jest.fn(),
    json: jest.fn(),
    end: jest.fn(),
  };
  response.status.mockReturnValue(response);

  return response;
};

const makeHost = (response: ResponseStub, type = 'http'): ArgumentsHost =>
  ({
    getType: () => type,
    switchToHttp: () => ({ getResponse: () => response }),
  }) as unknown as ArgumentsHost;

const bodyOf = (response: ResponseStub) => response.json.mock.calls[0][0];
const payloadOf = (
  logMethod: ReturnType<typeof stubLogger>['warn'],
): Record<string, unknown> => logMethod.mock.calls[0][1] ?? {};

describe('DomainExceptionFilter', () => {
  // The filter applies `Catch()` as a plain call rather than as `@Catch()`
  // decorator syntax, so that this file stays parseable by the consuming
  // packages that import the @packmind/node-utils barrel without decorator
  // support. These two assertions are what stop that trick from silently
  // regressing: without this metadata Nest never selects the filter, every
  // domain error goes back to being a 500, and no other test in this file
  // would notice.
  describe('registration metadata', () => {
    it('is watermarked as a catch filter', () => {
      expect(Reflect.getMetadata(CATCH_WATERMARK, DomainExceptionFilter)).toBe(
        true,
      );
    });

    it('declares no exception types, so it catches everything', () => {
      expect(
        Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, DomainExceptionFilter),
      ).toEqual([]);
    });
  });

  let logger: ReturnType<typeof stubLogger>;
  let response: ResponseStub;
  let filter: DomainExceptionFilter;

  beforeEach(() => {
    logger = stubLogger();
    response = makeResponse();
    filter = new DomainExceptionFilter(logger);
  });

  afterEach(() => jest.clearAllMocks());

  describe('when the host is not an HTTP context', () => {
    const exception = new Error('raised inside a worker');

    it('rethrows the exception', () => {
      expect(() => filter.catch(exception, makeHost(response, 'rpc'))).toThrow(
        exception,
      );
    });

    it('leaves the response status untouched', () => {
      expect(() => filter.catch(exception, makeHost(response, 'ws'))).toThrow();

      expect(response.status).not.toHaveBeenCalled();
    });

    it('writes no response body', () => {
      expect(() => filter.catch(exception, makeHost(response, 'ws'))).toThrow();

      expect(response.json).not.toHaveBeenCalled();
    });

    it('does not close the response', () => {
      expect(() => filter.catch(exception, makeHost(response, 'ws'))).toThrow();

      expect(response.end).not.toHaveBeenCalled();
    });
  });

  describe('when the headers have already been sent', () => {
    beforeEach(() => {
      response.headersSent = true;
      filter.catch(new ForbiddenTestError('too late'), makeHost(response));
    });

    it('closes the response', () => {
      expect(response.end).toHaveBeenCalledTimes(1);
    });

    it('writes no response body', () => {
      expect(response.json).not.toHaveBeenCalled();
    });

    it('sets no status code', () => {
      expect(response.status).not.toHaveBeenCalled();
    });
  });

  describe('when the exception is an HttpException', () => {
    describe('when it is a ConflictException', () => {
      const exception = new ConflictException(
        'a command already uses that slug',
      );

      beforeEach(() => {
        filter.catch(exception, makeHost(response));
      });

      it('responds with the status carried by the exception', () => {
        expect(response.status).toHaveBeenCalledWith(exception.getStatus());
      });

      it('responds with the exception response as body', () => {
        expect(bodyOf(response)).toEqual(exception.getResponse());
      });
    });

    describe('when it is a NotFoundException', () => {
      const exception = new NotFoundException('no such standard');

      beforeEach(() => {
        filter.catch(exception, makeHost(response));
      });

      it('responds with 404', () => {
        expect(response.status).toHaveBeenCalledWith(404);
      });

      it('responds with the exception response as body', () => {
        expect(bodyOf(response)).toEqual(exception.getResponse());
      });
    });
  });

  describe('when the exception is a forbidden DomainError', () => {
    const exception = new ForbiddenTestError('user may not read that space', {
      spaceId: 'space-id',
    });

    beforeEach(() => {
      filter.catch(exception, makeHost(response));
    });

    it('responds with 403', () => {
      expect(response.status).toHaveBeenCalledWith(403);
    });

    it('responds with a body carrying the status code', () => {
      expect(bodyOf(response)).toMatchObject({ statusCode: 403 });
    });

    it('responds with a body carrying the error message', () => {
      expect(bodyOf(response)).toMatchObject({
        message: 'user may not read that space',
      });
    });

    it('responds with a body carrying the error reason', () => {
      expect(bodyOf(response)).toMatchObject({ reason: 'test_forbidden' });
    });

    it('responds with a body carrying the error details', () => {
      expect(bodyOf(response)).toMatchObject({
        details: { spaceId: 'space-id' },
      });
    });

    it('logs at warn level', () => {
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('does not log at error level', () => {
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs the error kind', () => {
      expect(payloadOf(logger.warn)).toMatchObject({ kind: 'forbidden' });
    });

    it('logs no stack trace', () => {
      expect(payloadOf(logger.warn)).not.toHaveProperty('stack');
    });
  });

  describe('when the exception is a not_found DomainError', () => {
    const exception = new NotFoundTestError('no such command');

    beforeEach(() => {
      filter.catch(exception, makeHost(response));
    });

    it('responds with 404', () => {
      expect(response.status).toHaveBeenCalledWith(404);
    });

    it('responds with a body carrying the status code', () => {
      expect(bodyOf(response)).toMatchObject({ statusCode: 404 });
    });

    it('responds with a body carrying the error message', () => {
      expect(bodyOf(response)).toMatchObject({ message: 'no such command' });
    });

    it('responds with a body carrying the error reason', () => {
      expect(bodyOf(response)).toMatchObject({ reason: 'test_not_found' });
    });

    it('omits details from the body', () => {
      expect(bodyOf(response)).not.toHaveProperty('details');
    });

    it('logs at warn level', () => {
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('does not log at error level', () => {
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs no stack trace', () => {
      expect(payloadOf(logger.warn)).not.toHaveProperty('stack');
    });
  });

  describe('when the exception is an unknown error', () => {
    const exception = new Error('boom');

    beforeEach(() => {
      filter.catch(exception, makeHost(response));
    });

    it('responds with 500', () => {
      expect(response.status).toHaveBeenCalledWith(500);
    });

    it('responds with a generic body that leaks nothing', () => {
      expect(bodyOf(response)).toEqual({
        statusCode: 500,
        message: 'Internal server error',
      });
    });

    it('logs at error level', () => {
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it('does not log at warn level', () => {
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('logs the original error message', () => {
      expect(payloadOf(logger.error)).toMatchObject({ error: 'boom' });
    });

    it('logs the stack trace', () => {
      expect(payloadOf(logger.error)['stack']).toBe(exception.stack);
    });
  });
});
