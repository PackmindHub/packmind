import http from 'node:http';
import { AddressInfo } from 'node:net';
import {
  HTTP_KEEP_ALIVE_TIMEOUT_MS,
  HTTP_MAX_SOCKETS,
  sharedHttpAgent,
} from './sharedHttpAgents';

/**
 * The point of the shared agents is socket reuse across an idle gap, so these
 * tests measure exactly that: how many distinct client sockets the server saw.
 *
 * The server's own keep-alive timeout has to be raised out of the way first.
 * Node's http.Server closes idle connections after 5s by default, which will
 * close the socket before the client does and make a working agent look broken.
 */
describe('sharedHttpAgent', () => {
  const IDLE_GAP_MS = 50;

  let server: http.Server;
  let port: number;
  let clientPorts: Set<number>;

  const get = (agent: http.Agent): Promise<void> =>
    new Promise((resolve, reject) => {
      const request = http.get(
        { host: '127.0.0.1', port, path: '/', agent },
        (response) => {
          response.resume();
          response.on('end', () => resolve());
        },
      );
      request.on('error', reject);
    });

  const idle = () => new Promise((resolve) => setTimeout(resolve, IDLE_GAP_MS));

  beforeEach(async () => {
    clientPorts = new Set<number>();
    server = http.createServer((request, response) => {
      clientPorts.add(request.socket.remotePort as number);
      response.end('ok');
    });
    server.keepAliveTimeout = 60_000;
    server.headersTimeout = 65_000;

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    sharedHttpAgent.destroy();
    await new Promise<void>((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });
  });

  describe('when requests are separated by an idle gap', () => {
    it('reuses a single connection', async () => {
      await get(sharedHttpAgent);
      await idle();
      await get(sharedHttpAgent);

      expect(clientPorts.size).toBe(1);
    });
  });

  describe('when an agent with a shorter keep-alive window is used', () => {
    it('opens a second connection, which is what the shared agent avoids', async () => {
      // The behaviour of Node's default global agent, whose free sockets expire
      // after 5s. Reproduced here with a window shorter than the idle gap so the
      // contrast is observable without making the suite wait five seconds.
      const shortLived = new http.Agent({
        keepAlive: true,
        timeout: Math.floor(IDLE_GAP_MS / 5),
      });

      try {
        await get(shortLived);
        await idle();
        await get(shortLived);

        expect(clientPorts.size).toBe(2);
      } finally {
        shortLived.destroy();
      }
    });
  });

  it('keeps sockets far longer than the 5s Node defaults to', () => {
    expect(HTTP_KEEP_ALIVE_TIMEOUT_MS).toBeGreaterThan(5_000);
  });

  it('bounds concurrent connections per origin', () => {
    expect(sharedHttpAgent.maxSockets).toBe(HTTP_MAX_SOCKETS);
  });
});
