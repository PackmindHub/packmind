import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { PACKMIND_EDITION_HEADER } from '@packmind/types';
import { createEditionHeaderMiddleware } from './editionHeaderMiddleware';

@Controller('mounted')
class MountedController {
  @Get()
  ok(): { ok: true } {
    return { ok: true };
  }
}

type Captured = {
  status: number;
  edition: string | null;
};

/**
 * Boots a real server rather than calling the middleware directly.
 *
 * The unit spec beside the middleware proves it sets the header when it runs.
 * What matters here is *when Express runs it*: the response the CLI has to
 * read the edition off is a routing 404, produced for a path no controller
 * claims — in the OSS edition, a proprietary route replaced by a stub module
 * that mounts nothing. Only a request-level test shows the header survives
 * that path, and it is what rules out registering the middleware through
 * `NestModule.configure`, whose route binding skips unmatched requests.
 */
describe('the edition header over the request pipeline', () => {
  let app: INestApplication;
  let baseUrl: string;

  const call = async (path: string): Promise<Captured> => {
    const response = await fetch(`${baseUrl}${path}`);

    return {
      status: response.status,
      edition: response.headers.get(PACKMIND_EDITION_HEADER),
    };
  };

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      controllers: [MountedController],
    }).compile();

    app = testingModule.createNestApplication();
    // Registered exactly as `main.ts` registers it: an app.use middleware
    // closing over an edition resolved once at bootstrap.
    app.use(createEditionHeaderMiddleware('oss'));
    await app.listen(0);

    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when the request matches a mounted route', () => {
    let captured: Captured;

    beforeAll(async () => {
      captured = await call('/mounted');
    });

    it('answers 200', () => {
      expect(captured.status).toBe(200);
    });

    it('answers with the edition header', () => {
      expect(captured.edition).toBe('oss');
    });
  });

  describe('when the request matches no route at all', () => {
    let captured: Captured;

    beforeAll(async () => {
      captured = await call('/api/v0/organizations/org-id/playbook/apply');
    });

    it('answers 404', () => {
      expect(captured.status).toBe(404);
    });

    it('answers with the edition header', () => {
      expect(captured.edition).toBe('oss');
    });
  });
});
