import http from 'node:http';
import { AddressInfo } from 'node:net';
import axios, { AxiosInstance } from 'axios';
import { stubLogger } from '@packmind/test-utils';
import { retryStaleSocketReads } from './withTransientRetry';

// Deliberately NOT mocking axios: the whole point of this interceptor is how it
// behaves against a real socket that dies, which a mock cannot reproduce.
describe('retryStaleSocketReads', () => {
  const logger = stubLogger();

  let server: http.Server;
  let client: AxiosInstance;
  let requestsSeen: number;
  let destroyNextRequest: boolean;

  beforeEach(async () => {
    requestsSeen = 0;
    destroyNextRequest = false;

    server = http.createServer((request, response) => {
      requestsSeen += 1;
      if (destroyNextRequest) {
        destroyNextRequest = false;
        // A socket dying mid-request is what a keep-alive connection the peer
        // has already reaped looks like from our side: ECONNRESET, no response.
        request.socket.destroy();
        return;
      }
      response.end(JSON.stringify({ ok: true }));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );

    const { port } = server.address() as AddressInfo;
    client = axios.create({ baseURL: `http://127.0.0.1:${port}` });
    retryStaleSocketReads(client, logger);
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });
  });

  describe('when a read loses its connection', () => {
    beforeEach(() => {
      destroyNextRequest = true;
    });

    it('succeeds on the retry', async () => {
      const response = await client.get('/');

      expect(response.data).toEqual({ ok: true });
    });

    it('replays the request exactly once', async () => {
      await client.get('/');

      expect(requestsSeen).toBe(2);
    });
  });

  describe('when a write loses its connection', () => {
    beforeEach(() => {
      destroyNextRequest = true;
    });

    // A reset can happen after the server accepted the request, so replaying a
    // POST risks committing it twice. Failing is the safer answer.
    it('fails rather than risking a double commit', async () => {
      await expect(client.post('/', {})).rejects.toThrow();
    });

    it('does not replay the request', async () => {
      await client.post('/', {}).catch(() => undefined);

      expect(requestsSeen).toBe(1);
    });
  });

  describe('when the connection was never established', () => {
    it('fails without retrying, since no pooled socket went stale', async () => {
      server.close();
      const unreachable = axios.create({ baseURL: 'http://127.0.0.1:1' });
      retryStaleSocketReads(unreachable, logger);

      // ECONNREFUSED is not a stale socket — nothing was ever pooled.
      await expect(unreachable.get('/')).rejects.toMatchObject({
        code: 'ECONNREFUSED',
      });
    });
  });
});
