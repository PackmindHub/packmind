import {
  ConflictException,
  Controller,
  Get,
  INestApplication,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { DomainExceptionFilter } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  DomainError,
  DomainErrorDetails,
  DomainErrorKind,
} from '@packmind/types';

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

const LEAKED_MESSAGE = 'postgres connection string rotated';

@Controller('throwing')
class ThrowingController {
  @Get('forbidden')
  forbidden(): never {
    throw new ForbiddenTestError('user may not read that space', {
      spaceId: 'space-id',
    });
  }

  @Get('not-found')
  notFound(): never {
    throw new NotFoundTestError('no such command');
  }

  @Get('unknown')
  unknown(): never {
    throw new Error(LEAKED_MESSAGE);
  }

  @Get('conflict')
  conflict(): never {
    throw new ConflictException('a command already uses that slug');
  }
}

type Captured = {
  status: number;
  body: Record<string, unknown>;
};

/**
 * Boots a real HTTP server rather than calling `filter.catch()` directly.
 *
 * The unit spec next to the filter proves the mapping logic and asserts the
 * `Catch()` metadata by reflection, but neither proves that Nest actually
 * *selects* the filter for a request. That selection depends on the APP_FILTER
 * registration in `app.module.ts` and on Nest still reading the metadata the
 * filter writes by calling `Catch()` as a plain function — the trick that keeps
 * `@packmind/node-utils`'s barrel parseable by consumers compiled without
 * decorator support. If a Nest upgrade changed how either works, every domain
 * error would quietly go back to being a 500 and only a request-level test
 * would notice.
 *
 * It lives in `apps/api` and not beside the filter because this file needs
 * `@Controller()`/`@Get()` decorator syntax, and `packages/node-utils`'s jest
 * transform is deliberately configured without decorator support — that being
 * the very constraint the filter is written around.
 */
describe('DomainExceptionFilter over the request pipeline', () => {
  let app: INestApplication;
  let baseUrl: string;

  const call = async (path: string): Promise<Captured> => {
    const response = await fetch(`${baseUrl}/throwing/${path}`);

    return { status: response.status, body: await response.json() };
  };

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      controllers: [ThrowingController],
      providers: [
        // Registered exactly as `app.module.ts` registers it: APP_FILTER with a
        // useFactory. A useClass registration, or a manual
        // `app.useGlobalFilters()`, would not exercise the same code path.
        {
          provide: APP_FILTER,
          useFactory: () => new DomainExceptionFilter(stubLogger()),
        },
      ],
    }).compile();

    app = testingModule.createNestApplication();
    await app.listen(0);

    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when a route throws a forbidden DomainError', () => {
    let captured: Captured;

    beforeAll(async () => {
      captured = await call('forbidden');
    });

    it('answers 403', () => {
      expect(captured.status).toBe(403);
    });

    it('answers with a body carrying the error message', () => {
      expect(captured.body).toMatchObject({
        message: 'user may not read that space',
      });
    });

    it('answers with a body carrying the error reason', () => {
      expect(captured.body).toMatchObject({ reason: 'test_forbidden' });
    });

    it('answers with a body carrying the error details', () => {
      expect(captured.body).toMatchObject({
        details: { spaceId: 'space-id' },
      });
    });
  });

  describe('when a route throws a not_found DomainError', () => {
    let captured: Captured;

    beforeAll(async () => {
      captured = await call('not-found');
    });

    it('answers 404', () => {
      expect(captured.status).toBe(404);
    });

    it('answers with a body carrying the error message', () => {
      expect(captured.body).toMatchObject({ message: 'no such command' });
    });

    it('answers with a body carrying the error reason', () => {
      expect(captured.body).toMatchObject({ reason: 'test_not_found' });
    });
  });

  describe('when a route throws a plain Error', () => {
    let captured: Captured;

    beforeAll(async () => {
      captured = await call('unknown');
    });

    it('answers 500', () => {
      expect(captured.status).toBe(500);
    });

    it('answers with the generic body', () => {
      expect(captured.body).toEqual({
        statusCode: 500,
        message: 'Internal server error',
      });
    });

    it('does not leak the original error message', () => {
      expect(JSON.stringify(captured.body)).not.toContain(LEAKED_MESSAGE);
    });
  });

  describe('when a route throws an HttpException', () => {
    let captured: Captured;

    beforeAll(async () => {
      captured = await call('conflict');
    });

    it('answers with the status carried by the exception', () => {
      expect(captured.status).toBe(409);
    });

    it('answers with the body the exception carries', () => {
      expect(captured.body).toEqual({
        statusCode: 409,
        message: 'a command already uses that slug',
        error: 'Conflict',
      });
    });
  });
});
