import {
  BadRequestException,
  Controller,
  Get,
  INestApplication,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { DomainExceptionFilter } from '@packmind/node-utils/filters';
import {
  OrganizationAdminRequiredError,
  SpaceAdminRequiredError,
  SpaceMembershipRequiredError,
  UserNotFoundError,
  UserNotInOrganizationError,
} from '@packmind/node-utils';
import { AppModule } from '../../app.module';

const userId = '2b0a2a1e-6f3f-4a6f-9a3f-1f2e3d4c5b6a';
const organizationId = '8c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f';
const missingSpaceId = 'd4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70';
const forbiddenSpaceId = 'a1b2c3d4-e5f6-4718-9a0b-1c2d3e4f5a6b';

/**
 * Boots a throwaway module rather than `AppModule`, which would need a database
 * and a Redis to come up. Booting proves Nest actually selects the filter — a
 * unit test of `catch()` passes even when nothing ever calls it. The one thing a
 * throwaway module cannot prove, that the real application registers it, is
 * asserted from `AppModule`'s own metadata further down.
 */
@Controller('throws')
class ThrowingController {
  @Get('user-not-found')
  userNotFound(): never {
    throw new UserNotFoundError({ userId });
  }

  @Get('user-not-in-organization')
  userNotInOrganization(): never {
    throw new UserNotInOrganizationError({ userId, organizationId });
  }

  @Get('organization-admin-required')
  organizationAdminRequired(): never {
    throw new OrganizationAdminRequiredError({ userId, organizationId });
  }

  @Get('space-membership-required/forbidden')
  spaceMembershipForbidden(): never {
    throw new SpaceMembershipRequiredError(userId, forbiddenSpaceId);
  }

  @Get('space-membership-required/missing')
  spaceMembershipMissing(): never {
    throw new SpaceMembershipRequiredError(userId, missingSpaceId);
  }

  @Get('space-admin-required')
  spaceAdminRequired(): never {
    throw new SpaceAdminRequiredError(userId, forbiddenSpaceId);
  }

  @Get('plain-error')
  plainError(): never {
    throw new Error('boom');
  }

  @Get('http-exception')
  httpException(): never {
    throw new BadRequestException('nope');
  }
}

type Captured = {
  status: number;
  text: string;
  body: Record<string, unknown>;
};

describe('the domain exception filter over HTTP', () => {
  let app: INestApplication;
  let baseUrl: string;

  const call = async (path: string): Promise<Captured> => {
    const response = await fetch(`${baseUrl}/throws/${path}`);
    const text = await response.text();

    return { status: response.status, text, body: JSON.parse(text) };
  };

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      controllers: [ThrowingController],
      providers: [
        // Registered exactly as `AppModule` registers it — including the
        // `PackmindLogger` provider the filter is injected with there.
        {
          provide: APP_FILTER,
          useClass: DomainExceptionFilter,
        },
        {
          provide: PackmindLogger,
          useFactory: () =>
            new PackmindLogger('DomainExceptionFilter', LogLevel.SILENT),
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

  describe.each([
    {
      route: 'user-not-found',
      status: 404,
      message: 'The user account could not be found.',
      reason: 'user_not_found',
      identifiers: [userId],
    },
    {
      route: 'user-not-in-organization',
      status: 403,
      message: 'That user is not a member of this organization.',
      reason: 'user_not_in_organization',
      identifiers: [userId, organizationId],
    },
    {
      route: 'organization-admin-required',
      status: 403,
      message:
        'You must be an admin of this organization to perform this action.',
      reason: 'user_not_an_admin',
      identifiers: [userId, organizationId],
    },
    {
      route: 'space-membership-required/forbidden',
      status: 404,
      message: 'This space does not exist, or you do not have access to it.',
      reason: 'space_membership_required',
      identifiers: [userId, forbiddenSpaceId],
    },
    {
      route: 'space-admin-required',
      status: 403,
      message: 'You must be an admin of this space to perform this action.',
      reason: 'space_admin_required',
      identifiers: [userId, forbiddenSpaceId],
    },
  ])(
    'when $route throws',
    ({ route, status, message, reason, identifiers }) => {
      let captured: Captured;

      beforeAll(async () => {
        captured = await call(route);
      });

      it(`answers ${status}`, () => {
        expect(captured.status).toBe(status);
      });

      it('answers with the class message', () => {
        expect(captured.body.message).toBe(message);
      });

      it('answers with the machine-readable reason', () => {
        expect(captured.body.reason).toBe(reason);
      });

      it('answers with the status code in the body', () => {
        expect(captured.body.statusCode).toBe(status);
      });

      it('answers with exactly statusCode, message and reason', () => {
        expect(Object.keys(captured.body).sort()).toEqual([
          'message',
          'reason',
          'statusCode',
        ]);
      });

      it('leaks none of the identifiers it was built with', () => {
        identifiers.forEach((identifier) => {
          expect(captured.text).not.toContain(identifier);
        });
      });
    },
  );

  describe('when a space the caller is not in and a space that does not exist both answer', () => {
    let forbidden: Captured;
    let missing: Captured;

    beforeAll(async () => {
      forbidden = await call('space-membership-required/forbidden');
      missing = await call('space-membership-required/missing');
    });

    it('answers the same status', () => {
      expect(missing.status).toBe(forbidden.status);
    });

    it('answers a byte-identical body', () => {
      expect(missing.text).toBe(forbidden.text);
    });
  });

  describe('when an unannotated error is thrown', () => {
    let captured: Captured;

    beforeAll(async () => {
      captured = await call('plain-error');
    });

    it('answers 500', () => {
      expect(captured.status).toBe(500);
    });

    it("answers Nest's own body", () => {
      expect(captured.body).toEqual({
        statusCode: 500,
        message: 'Internal server error',
      });
    });

    it('leaks nothing of the thrown message', () => {
      expect(captured.text).not.toContain('boom');
    });
  });

  describe('when an HttpException is thrown', () => {
    let captured: Captured;

    beforeAll(async () => {
      captured = await call('http-exception');
    });

    it('answers its own status', () => {
      expect(captured.status).toBe(400);
    });

    it('answers its own body, untouched', () => {
      expect(captured.body).toEqual({
        statusCode: 400,
        message: 'nope',
        error: 'Bad Request',
      });
    });
  });

  describe('the registration in AppModule', () => {
    let providers: unknown[];

    beforeAll(() => {
      providers = Reflect.getMetadata('providers', AppModule) as unknown[];
    });

    it('declares the filter as an APP_FILTER provider', () => {
      expect(providers).toContainEqual({
        provide: APP_FILTER,
        useClass: DomainExceptionFilter,
      });
    });
  });
});
