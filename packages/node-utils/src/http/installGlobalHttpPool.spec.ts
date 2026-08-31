import http from 'node:http';
import { AddressInfo } from 'node:net';
import { Agent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import { installGlobalHttpPool } from './installGlobalHttpPool';

describe('installGlobalHttpPool', () => {
  let originalDispatcher: ReturnType<typeof getGlobalDispatcher>;
  let installed: Agent;

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher();
    installed = installGlobalHttpPool();
  });

  afterEach(async () => {
    setGlobalDispatcher(originalDispatcher);
    await installed.close();
  });

  /**
   * The userland undici package and the copy bundled inside Node agree on a
   * versioned global symbol, which is the only reason calling
   * setGlobalDispatcher here reaches Node's built-in fetch at all. If the two
   * ever drift apart the call becomes a silent no-op, so assert the binding
   * rather than trusting it.
   */
  it('binds the dispatcher that Node built-in fetch resolves', () => {
    expect(globalThis[Symbol.for('undici.globalDispatcher.1')]).toBe(installed);
  });

  it('replaces the dispatcher that was in place', () => {
    expect(getGlobalDispatcher()).not.toBe(originalDispatcher);
  });

  describe('when fetch is used across an idle gap', () => {
    let server: http.Server;
    let clientPorts: Set<number>;

    beforeEach(async () => {
      clientPorts = new Set<number>();
      server = http.createServer((request, response) => {
        clientPorts.add(request.socket.remotePort as number);
        response.end('ok');
      });
      server.keepAliveTimeout = 60_000;
      server.headersTimeout = 65_000;
      await new Promise<void>((resolve) =>
        server.listen(0, '127.0.0.1', resolve),
      );
    });

    afterEach(async () => {
      await new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      });
    });

    it('reuses the connection', async () => {
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;

      await fetch(url).then((response) => response.text());
      await new Promise((resolve) => setTimeout(resolve, 50));
      await fetch(url).then((response) => response.text());

      expect(clientPorts.size).toBe(1);
    });
  });
});
