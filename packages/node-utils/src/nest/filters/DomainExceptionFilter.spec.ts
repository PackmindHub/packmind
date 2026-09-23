import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpServer,
  HttpStatus,
} from '@nestjs/common';
import { stubLogger } from '@packmind/test-utils';
import {
  DomainError,
  DomainErrorKind,
  PackmindInternalError,
  PackmindUpstreamError,
  UpstreamErrorKind,
} from '@packmind/types';
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
  let setHeader: jest.Mock;
  let host: ArgumentsHost;

  const capturedStatus = (): number => status.mock.calls[0][0];
  const capturedBody = (): Record<string, unknown> => json.mock.calls[0][0];

  // Everything the filter does not handle itself goes through Nest's own
  // `BaseExceptionFilter`, which writes through the application ref rather than
  // through `switchToHttp()`.
  const repliedStatus = (): number => reply.mock.calls[0][2];
  const repliedBody = (): Record<string, unknown> => reply.mock.calls[0][1];

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    reply = jest.fn();
    end = jest.fn();
    isHeadersSent = jest.fn().mockReturnValue(false);
    setHeader = jest.fn();

    const response = { status, setHeader };

    host = {
      switchToHttp: () => ({ getResponse: () => response }),
      getArgByIndex: (index: number) => (index === 1 ? response : undefined),
    } as unknown as ArgumentsHost;

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
  });

  describe('when the exception is an invalid_input domain error', () => {
    beforeEach(() => {
      filter.catch(
        new TestDomainError(
          'invalid_input',
          'target_path_invalid',
          'The target path is not a valid path.',
        ),
        host,
      );
    });

    it('responds with 400', () => {
      expect(capturedStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('carries the reason in the body', () => {
      expect(capturedBody()).toEqual({
        statusCode: 400,
        message: 'The target path is not a valid path.',
        reason: 'target_path_invalid',
      });
    });
  });

  describe('when the exception is a conflict domain error', () => {
    beforeEach(() => {
      filter.catch(
        new TestDomainError(
          'conflict',
          'root_target_not_deletable',
          'The root target cannot be deleted.',
        ),
        host,
      );
    });

    it('responds with 409', () => {
      expect(capturedStatus()).toBe(HttpStatus.CONFLICT);
    });

    it('carries the reason in the body', () => {
      expect(capturedBody()).toEqual({
        statusCode: 409,
        message: 'The root target cannot be deleted.',
        reason: 'root_target_not_deletable',
      });
    });
  });

  // The policy table, stated as behaviour: a new kind added to the union
  // without a row here fails to compile, and a row given the wrong status
  // fails here.
  describe.each([
    ['forbidden', HttpStatus.FORBIDDEN],
    ['not_found', HttpStatus.NOT_FOUND],
    ['invalid_input', HttpStatus.BAD_REQUEST],
    ['conflict', HttpStatus.CONFLICT],
  ] satisfies ReadonlyArray<[DomainErrorKind, number]>)(
    'when the domain error kind is %s',
    (kind, expectedStatus) => {
      beforeEach(() => {
        filter.catch(new TestDomainError(kind, 'a_reason', 'A message.'), host);
      });

      it('answers with the status the policy table states', () => {
        expect(capturedStatus()).toBe(expectedStatus);
      });
    },
  );

  describe('when the exception is an upstream_unavailable error', () => {
    beforeEach(() => {
      filter.catch(
        new PackmindUpstreamError(
          'upstream_unavailable',
          'gitlab_unreachable',
          { provider: 'gitlab' },
          'GitLab did not answer, try again shortly.',
        ),
        host,
      );
    });

    it('responds with 502, because the failure is behind us and not ours', () => {
      expect(capturedStatus()).toBe(HttpStatus.BAD_GATEWAY);
    });

    it('returns the message to the caller', () => {
      expect(capturedBody()).toEqual({
        statusCode: 502,
        message: 'GitLab did not answer, try again shortly.',
        reason: 'gitlab_unreachable',
      });
    });

    it('sets no Retry-After header, because no delay was given', () => {
      expect(setHeader).not.toHaveBeenCalled();
    });

    it('keeps the context out of the body', () => {
      expect(Object.keys(capturedBody()).sort()).toEqual([
        'message',
        'reason',
        'statusCode',
      ]);
    });
  });

  describe('when the exception is an upstream_rate_limited error', () => {
    beforeEach(() => {
      filter.catch(
        new PackmindUpstreamError(
          'upstream_rate_limited',
          'github_rate_limited',
          { provider: 'github' },
          'GitHub is rate limiting us, try again shortly.',
          60,
        ),
        host,
      );
    });

    it('responds with 429', () => {
      expect(capturedStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('returns the message to the caller', () => {
      expect(capturedBody()).toEqual({
        statusCode: 429,
        message: 'GitHub is rate limiting us, try again shortly.',
        reason: 'github_rate_limited',
      });
    });

    it('sets Retry-After from the delay the provider gave', () => {
      expect(setHeader).toHaveBeenCalledWith('Retry-After', '60');
    });
  });

  describe('when a rate-limited error carries no delay', () => {
    beforeEach(() => {
      filter.catch(
        new PackmindUpstreamError(
          'upstream_rate_limited',
          'github_rate_limited',
          {},
          'GitHub is rate limiting us, try again shortly.',
        ),
        host,
      );
    });

    it('omits the Retry-After header', () => {
      expect(setHeader).not.toHaveBeenCalled();
    });

    it('still answers with 429', () => {
      expect(capturedStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });
  });

  describe('when the response object has no setHeader', () => {
    beforeEach(() => {
      const bareResponse = { status };
      const bareHost = {
        switchToHttp: () => ({ getResponse: () => bareResponse }),
        getArgByIndex: (index: number) =>
          index === 1 ? bareResponse : undefined,
      } as unknown as ArgumentsHost;

      filter.catch(
        new PackmindUpstreamError(
          'upstream_rate_limited',
          'github_rate_limited',
          {},
          'GitHub is rate limiting us, try again shortly.',
          60,
        ),
        bareHost,
      );
    });

    it('still writes the body', () => {
      expect(capturedStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });
  });

  // The upstream policy table, stated as behaviour: a new kind added to the
  // union without a row fails to compile, and a row given the wrong status
  // fails here.
  describe.each([
    ['upstream_unavailable', HttpStatus.BAD_GATEWAY],
    ['upstream_rate_limited', HttpStatus.TOO_MANY_REQUESTS],
  ] satisfies ReadonlyArray<[UpstreamErrorKind, number]>)(
    'when the upstream error kind is %s',
    (kind, expectedStatus) => {
      beforeEach(() => {
        filter.catch(
          new PackmindUpstreamError(kind, 'a_reason', {}, 'A message.'),
          host,
        );
      });

      it('answers with the status the policy table states', () => {
        expect(capturedStatus()).toBe(expectedStatus);
      });
    },
  );

  describe('when the exception is an internal error', () => {
    beforeEach(() => {
      filter.catch(
        new PackmindInternalError(
          'package_reload_failed',
          { packageId: '9ff2d85e-d9e4-40ae-bd02-c24429ba0d20' },
          'Failed to retrieve the updated package.',
        ),
        host,
      );
    });

    it('responds with 500', () => {
      expect(repliedStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it("keeps Nest's generic body, so the message never reaches the caller", () => {
      expect(repliedBody()).toEqual({
        statusCode: 500,
        message: 'Internal server error',
      });
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
