import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpServer,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { stubLogger } from '@packmind/test-utils';
import { DomainError, DomainErrorKind } from '@packmind/types';
import { DomainExceptionFilter } from './DomainExceptionFilter';

class TestDomainError extends Error implements DomainError {
  readonly kind: DomainErrorKind;
  readonly reason: string;
  readonly context?: Record<string, unknown>;

  constructor(
    kind: DomainErrorKind,
    reason: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'TestDomainError';
    this.kind = kind;
    this.reason = reason;
    this.context = context;
  }
}

describe('DomainExceptionFilter', () => {
  let filter: DomainExceptionFilter;
  let logger: ReturnType<typeof stubLogger>;
  let json: jest.Mock;
  let status: jest.Mock;
  let reply: jest.Mock;
  let end: jest.Mock;
  let isHeadersSent: jest.Mock;
  let nestErrorLog: jest.SpyInstance;
  let host: ArgumentsHost;

  const capturedStatus = (): number => status.mock.calls[0][0];
  const capturedBody = (): Record<string, unknown> => json.mock.calls[0][0];

  // Everything the filter does not handle itself goes through Nest's own
  // `BaseExceptionFilter`, which writes through the application ref rather than
  // through `switchToHttp()`.
  const repliedStatus = (): number => reply.mock.calls[0][2];
  const repliedBody = (): Record<string, unknown> => reply.mock.calls[0][1];

  const warnPayload = (): Record<string, unknown> =>
    logger.warn.mock.calls[0][1] as Record<string, unknown>;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    reply = jest.fn();
    end = jest.fn();
    isHeadersSent = jest.fn().mockReturnValue(false);

    const response = { status };

    host = {
      switchToHttp: () => ({ getResponse: () => response }),
      getArgByIndex: (index: number) => (index === 1 ? response : undefined),
    } as unknown as ArgumentsHost;

    // Nest's `ExceptionsHandler` logger, which `super.catch` writes to. Spied
    // rather than asserted through the injected logger, because delegation
    // means the injected one is no longer what reports unhandled exceptions.
    nestErrorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    logger = stubLogger();

    filter = new DomainExceptionFilter(logger, {
      isHeadersSent,
      reply,
      end,
    } as unknown as HttpServer);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when the exception is a forbidden domain error', () => {
    beforeEach(() => {
      filter.catch(
        new TestDomainError(
          'forbidden',
          'user_not_in_organization',
          'That user is not a member of this organization.',
        ),
        host,
      );
    });

    it('responds with 403', () => {
      expect(capturedStatus()).toBe(HttpStatus.FORBIDDEN);
    });

    it('carries the reason in the body', () => {
      expect(capturedBody()).toEqual({
        statusCode: 403,
        message: 'That user is not a member of this organization.',
        reason: 'user_not_in_organization',
      });
    });

    it('writes exactly statusCode, message and reason', () => {
      expect(Object.keys(capturedBody()).sort()).toEqual([
        'message',
        'reason',
        'statusCode',
      ]);
    });

    it('logs at warn with the reason', () => {
      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ reason: 'user_not_in_organization' }),
      );
    });

    it('keeps the stack out of the warn payload', () => {
      expect(Object.keys(warnPayload())).not.toContain('stack');
    });

    it('does not log at error', () => {
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("does not reach Nest's unhandled-exception log", () => {
      expect(nestErrorLog).not.toHaveBeenCalled();
    });
  });

  describe('when the exception is a not_found domain error', () => {
    beforeEach(() => {
      filter.catch(
        new TestDomainError(
          'not_found',
          'user_not_found',
          'The user account could not be found.',
        ),
        host,
      );
    });

    it('responds with 404', () => {
      expect(capturedStatus()).toBe(HttpStatus.NOT_FOUND);
    });

    it('carries the reason in the body', () => {
      expect(capturedBody()).toEqual({
        statusCode: 404,
        message: 'The user account could not be found.',
        reason: 'user_not_found',
      });
    });
  });

  describe('when the domain error carries a context', () => {
    const context = {
      userId: '8f1c1a4e-2f1e-4d0b-9d6f-9d0f5d3f1a2b',
      organizationId: '2b3c4d5e-6f70-4812-9a3b-4c5d6e7f8091',
    };

    beforeEach(() => {
      filter.catch(
        new TestDomainError(
          'forbidden',
          'space_membership_required',
          'You do not have access to this space.',
          context,
        ),
        host,
      );
    });

    it('keeps the context out of the body', () => {
      expect(Object.keys(capturedBody()).sort()).toEqual([
        'message',
        'reason',
        'statusCode',
      ]);
    });

    it('logs the context', () => {
      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ context }),
      );
    });

    it('still keeps the stack out of the warn payload', () => {
      expect(Object.keys(warnPayload())).not.toContain('stack');
    });
  });

  describe('when the exception is an HttpException', () => {
    beforeEach(() => {
      filter.catch(new BadRequestException('Nope'), host);
    });

    it('keeps its own status', () => {
      expect(repliedStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('keeps its own body', () => {
      expect(repliedBody()).toEqual({
        statusCode: 400,
        message: 'Nope',
        error: 'Bad Request',
      });
    });
  });

  describe('when the HttpException carries a string payload', () => {
    beforeEach(() => {
      filter.catch(new HttpException('Teapot', HttpStatus.I_AM_A_TEAPOT), host);
    });

    it('keeps its own status', () => {
      expect(repliedStatus()).toBe(HttpStatus.I_AM_A_TEAPOT);
    });

    it('wraps the payload the way Nest does', () => {
      expect(repliedBody()).toEqual({ statusCode: 418, message: 'Teapot' });
    });
  });

  describe('when the exception is a plain Error', () => {
    let thrown: Error;

    beforeEach(() => {
      thrown = new Error('boom');
      filter.catch(thrown, host);
    });

    it('responds with 500', () => {
      expect(repliedStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it("keeps Nest's own internal server error body", () => {
      expect(repliedBody()).toEqual({
        statusCode: 500,
        message: 'Internal server error',
      });
    });

    it('logs at error, with the stack, through Nest', () => {
      expect(nestErrorLog).toHaveBeenCalledWith(thrown);
    });

    it('does not log through the injected logger', () => {
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('does not log at warn', () => {
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('when the exception comes from the http-errors library', () => {
    beforeEach(() => {
      filter.catch(
        Object.assign(new Error('request entity too large'), {
          statusCode: 413,
        }),
        host,
      );
    });

    it('keeps the http-errors status', () => {
      expect(repliedStatus()).toBe(413);
    });

    it('keeps the http-errors message', () => {
      expect(repliedBody()).toEqual({
        statusCode: 413,
        message: 'request entity too large',
      });
    });
  });

  describe('when the response headers are already sent', () => {
    beforeEach(() => {
      isHeadersSent.mockReturnValue(true);
      filter.catch(new Error('boom'), host);
    });

    it('ends the response instead of writing to it', () => {
      expect(end).toHaveBeenCalled();
    });

    it('writes no body', () => {
      expect(reply).not.toHaveBeenCalled();
    });
  });
});
