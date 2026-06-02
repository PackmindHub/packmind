import axios from 'axios';
import { generateKeyPairSync } from 'crypto';
import { stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  AppInstallationTokenResolver,
  base64Url,
  mintAppJwt,
} from './AppInstallationTokenResolver';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AppInstallationTokenResolver', () => {
  let privateKeyPem: string;
  let publicKeyPem: string;
  let logger: jest.Mocked<PackmindLogger>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockHttpClient: jest.Mocked<any>;

  beforeAll(() => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    privateKeyPem = privateKey.export({
      type: 'pkcs1',
      format: 'pem',
    }) as string;
    publicKeyPem = publicKey.export({ type: 'pkcs1', format: 'pem' }) as string;
  });

  beforeEach(() => {
    logger = stubLogger();
    mockHttpClient = { post: jest.fn() };
    mockedAxios.create.mockReturnValue(mockHttpClient);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  function buildResolver(
    overrides: Partial<{ onRevoke: () => Promise<void> }> = {},
  ) {
    return new AppInstallationTokenResolver(
      {
        providerId: 'provider-1' as never, // GitProviderId brand; cast in test only
        appId: 12345,
        privateKeyPem,
        installationId: 67890,
        onRevoke: overrides.onRevoke,
      },
      logger,
    );
  }

  function mockExchangeResponse(token: string, expiresInMs: number) {
    mockHttpClient.post.mockResolvedValue({
      data: {
        token,
        expires_at: new Date(Date.now() + expiresInMs).toISOString(),
      },
    });
  }

  describe('mintAppJwt (pure helper)', () => {
    it('produces a JWT with three base64url segments', () => {
      const jwt = mintAppJwt(42, privateKeyPem);
      const parts = jwt.split('.');
      expect(parts).toHaveLength(3);
      parts.forEach((segment) => {
        expect(segment).toMatch(/^[A-Za-z0-9_-]+$/);
      });
    });

    it('encodes header and payload with expected fields', () => {
      const before = Math.floor(Date.now() / 1000);
      const jwt = mintAppJwt(42, privateKeyPem);
      const [encodedHeader, encodedPayload] = jwt.split('.');

      const decode = (segment: string): unknown =>
        JSON.parse(
          Buffer.from(
            segment.replace(/-/g, '+').replace(/_/g, '/'),
            'base64',
          ).toString('utf8'),
        );

      expect(decode(encodedHeader)).toEqual({ alg: 'RS256', typ: 'JWT' });
      const payload = decode(encodedPayload) as Record<string, number>;
      expect(payload.iss).toBe(42);
      expect(payload.iat).toBeLessThanOrEqual(before);
      // exp ≤ iat + 10 minutes (GitHub upper bound)
      expect(payload.exp - payload.iat).toBeLessThanOrEqual(600);
    });

    it('produces a signature verifiable with the corresponding public key', () => {
      const { createVerify } = jest.requireActual(
        'crypto',
      ) as typeof import('crypto');
      const jwt = mintAppJwt(42, privateKeyPem);
      const [h, p, s] = jwt.split('.');
      const verifier = createVerify('RSA-SHA256');
      verifier.update(`${h}.${p}`);
      verifier.end();
      const signatureBuf = Buffer.from(
        s.replace(/-/g, '+').replace(/_/g, '/'),
        'base64',
      );
      expect(verifier.verify(publicKeyPem, signatureBuf)).toBe(true);
    });
  });

  describe('base64Url', () => {
    it('encodes a buffer without padding and with url-safe chars', () => {
      expect(base64Url(Buffer.from('hello?>?'))).toBe('aGVsbG8_Pj8');
    });
  });

  describe('getToken', () => {
    describe('when no token is cached', () => {
      it('mints a JWT, exchanges it, and returns the access token', async () => {
        mockExchangeResponse('ghs_installation_abc', 60 * 60 * 1000);
        const resolver = buildResolver();

        const token = await resolver.getToken();

        expect(token).toBe('ghs_installation_abc');
        expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
        const [url, body, opts] = mockHttpClient.post.mock.calls[0];
        expect(url).toBe('/app/installations/67890/access_tokens');
        expect(body).toEqual({});
        expect(opts.headers.Authorization).toMatch(
          /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/,
        );
      });
    });

    describe('when a valid token is cached', () => {
      it('does not re-mint or re-exchange on subsequent calls', async () => {
        mockExchangeResponse('ghs_installation_abc', 60 * 60 * 1000);
        const resolver = buildResolver();

        const first = await resolver.getToken();
        const second = await resolver.getToken();

        expect(first).toBe(second);
        expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the cached token is close to expiry', () => {
      it('refreshes after expires_at - safety margin', async () => {
        jest.useFakeTimers();
        const now = new Date('2030-01-01T00:00:00Z').getTime();
        jest.setSystemTime(now);

        // First exchange: token good for 60s (less than the 60s safety margin
        // → effectively immediately considered expired on the *next* tick).
        mockHttpClient.post.mockResolvedValueOnce({
          data: {
            token: 'ghs_short',
            expires_at: new Date(now + 65_000).toISOString(),
          },
        });

        const resolver = buildResolver();
        const first = await resolver.getToken();
        expect(first).toBe('ghs_short');

        // Advance past safety margin so cache is stale.
        jest.setSystemTime(now + 10_000);

        mockHttpClient.post.mockResolvedValueOnce({
          data: {
            token: 'ghs_fresh',
            expires_at: new Date(now + 70 * 60_000).toISOString(),
          },
        });

        const second = await resolver.getToken();
        expect(second).toBe('ghs_fresh');
        expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
      });
    });

    describe('when the token exchange fails', () => {
      it('throws a provider-friendly error and does not cache', async () => {
        mockHttpClient.post.mockRejectedValue({
          isAxiosError: true,
          response: { status: 404, data: { message: 'Not Found' } },
        });
        const resolver = buildResolver();

        await expect(resolver.getToken()).rejects.toThrow(
          /Failed to exchange App JWT/,
        );

        // Should still be uncached → next call triggers a new exchange.
        mockExchangeResponse('ghs_after_recovery', 60 * 60 * 1000);
        const recovered = await resolver.getToken();
        expect(recovered).toBe('ghs_after_recovery');
      });
    });
  });

  describe('onUnauthorized', () => {
    it('clears the cache so the next getToken re-mints and re-exchanges', async () => {
      mockExchangeResponse('ghs_first', 60 * 60 * 1000);
      const resolver = buildResolver();
      await resolver.getToken();
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

      await resolver.onUnauthorized();

      mockExchangeResponse('ghs_second', 60 * 60 * 1000);
      const after = await resolver.getToken();
      expect(after).toBe('ghs_second');
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });

    it('invokes the onRevoke callback when provided', async () => {
      const onRevoke = jest.fn().mockResolvedValue(undefined);
      const resolver = buildResolver({ onRevoke });

      await resolver.onUnauthorized();

      expect(onRevoke).toHaveBeenCalledTimes(1);
    });

    it('propagates errors from onRevoke', async () => {
      const onRevoke = jest.fn().mockRejectedValue(new Error('db down'));
      const resolver = buildResolver({ onRevoke });

      await expect(resolver.onUnauthorized()).rejects.toThrow('db down');
    });

    it('is a no-op for onRevoke when none is provided', async () => {
      const resolver = buildResolver();
      await expect(resolver.onUnauthorized()).resolves.toBeUndefined();
    });
  });

  describe('getKind', () => {
    it('reports the installation kind', () => {
      const resolver = buildResolver();
      expect(resolver.getKind()).toBe('installation');
    });
  });

  describe('integration (gated on GITHUB_APP_* env)', () => {
    const hasEnv =
      !!process.env['GITHUB_APP_ID'] &&
      !!process.env['GITHUB_APP_PRIVATE_KEY'] &&
      !!process.env['GITHUB_APP_INSTALLATION_ID'];
    const maybe = hasEnv ? it : it.skip;

    maybe(
      'mints a real installation token against api.github.com',
      async () => {
        // Use the real axios — NOT the jest-mocked one.
        jest.unmock('axios');
        const realAxios = jest.requireActual('axios') as typeof import('axios');
        const realClient = realAxios.default.create({
          baseURL: 'https://api.github.com',
          headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        const resolver = new AppInstallationTokenResolver(
          {
            providerId: 'integration' as never,
            appId: Number(process.env['GITHUB_APP_ID']),
            privateKeyPem: process.env['GITHUB_APP_PRIVATE_KEY'] as string,
            installationId: Number(process.env['GITHUB_APP_INSTALLATION_ID']),
          },
          stubLogger(),
          realClient,
        );

        const token = await resolver.getToken();
        expect(token).toMatch(/^ghs_/);
      },
    );
  });
});
