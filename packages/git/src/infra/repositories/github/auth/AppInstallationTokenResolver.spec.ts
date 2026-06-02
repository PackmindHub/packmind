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

  function buildResolver() {
    return new AppInstallationTokenResolver(
      {
        providerId: 'provider-1' as never, // GitProviderId brand; cast in test only
        appId: 12345,
        privateKeyPem,
        installationId: 67890,
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
    describe('produces a JWT with three base64url segments', () => {
      let parts: string[];

      beforeEach(() => {
        const jwt = mintAppJwt(42, privateKeyPem);
        parts = jwt.split('.');
      });

      it('has three segments', () => {
        expect(parts).toHaveLength(3);
      });

      it('uses base64url charset in every segment', () => {
        parts.forEach((segment) => {
          expect(segment).toMatch(/^[A-Za-z0-9_-]+$/);
        });
      });
    });

    describe('encodes header and payload with expected fields', () => {
      let before: number;
      let encodedHeader: string;
      let encodedPayload: string;

      const decode = (segment: string): unknown =>
        JSON.parse(
          Buffer.from(
            segment.replace(/-/g, '+').replace(/_/g, '/'),
            'base64',
          ).toString('utf8'),
        );

      beforeEach(() => {
        before = Math.floor(Date.now() / 1000);
        const jwt = mintAppJwt(42, privateKeyPem);
        [encodedHeader, encodedPayload] = jwt.split('.');
      });

      it('encodes the header with alg and typ', () => {
        expect(decode(encodedHeader)).toEqual({ alg: 'RS256', typ: 'JWT' });
      });

      it('sets iss to the app id', () => {
        const payload = decode(encodedPayload) as Record<string, number>;
        expect(payload.iss).toBe(42);
      });

      it('sets iat at or before the current time', () => {
        const payload = decode(encodedPayload) as Record<string, number>;
        expect(payload.iat).toBeLessThanOrEqual(before);
      });

      it('keeps exp within the 10 minute GitHub upper bound', () => {
        const payload = decode(encodedPayload) as Record<string, number>;
        // exp ≤ iat + 10 minutes (GitHub upper bound)
        expect(payload.exp - payload.iat).toBeLessThanOrEqual(600);
      });
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
      let token: string;
      let url: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let body: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let opts: any;

      beforeEach(async () => {
        mockExchangeResponse('ghs_installation_abc', 60 * 60 * 1000);
        const resolver = buildResolver();

        token = await resolver.getToken();
        [url, body, opts] = mockHttpClient.post.mock.calls[0];
      });

      it('returns the access token from the exchange', () => {
        expect(token).toBe('ghs_installation_abc');
      });

      it('calls the exchange endpoint exactly once', () => {
        expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      });

      it('posts to the installation access tokens URL', () => {
        expect(url).toBe('/app/installations/67890/access_tokens');
      });

      it('sends an empty body', () => {
        expect(body).toEqual({});
      });

      it('passes a bearer JWT in the Authorization header', () => {
        expect(opts.headers.Authorization).toMatch(
          /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/,
        );
      });
    });

    describe('when a valid token is cached', () => {
      let first: string;
      let second: string;

      beforeEach(async () => {
        mockExchangeResponse('ghs_installation_abc', 60 * 60 * 1000);
        const resolver = buildResolver();

        first = await resolver.getToken();
        second = await resolver.getToken();
      });

      it('returns the same token on subsequent calls', () => {
        expect(first).toBe(second);
      });

      it('does not re-exchange on subsequent calls', () => {
        expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the cached token is close to expiry', () => {
      let first: string;
      let second: string;

      beforeEach(async () => {
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
        first = await resolver.getToken();

        // Advance past safety margin so cache is stale.
        jest.setSystemTime(now + 10_000);

        mockHttpClient.post.mockResolvedValueOnce({
          data: {
            token: 'ghs_fresh',
            expires_at: new Date(now + 70 * 60_000).toISOString(),
          },
        });

        second = await resolver.getToken();
      });

      it('returns the short-lived token on the first call', () => {
        expect(first).toBe('ghs_short');
      });

      it('refreshes to a new token after the safety margin', () => {
        expect(second).toBe('ghs_fresh');
      });

      it('re-exchanges with the GitHub API on the refresh', () => {
        expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
      });
    });

    describe('when the token exchange fails', () => {
      let resolver: AppInstallationTokenResolver;
      let firstCall: Promise<string>;

      beforeEach(() => {
        mockHttpClient.post.mockRejectedValue({
          isAxiosError: true,
          response: { status: 404, data: { message: 'Not Found' } },
        });
        resolver = buildResolver();
        firstCall = resolver.getToken();
        firstCall.catch(() => undefined);
      });

      it('throws a provider-friendly error', async () => {
        await expect(firstCall).rejects.toThrow(/Failed to exchange App JWT/);
      });

      it('does not cache the failure so the next call triggers a new exchange', async () => {
        await firstCall.catch(() => undefined);

        // Should still be uncached → next call triggers a new exchange.
        mockExchangeResponse('ghs_after_recovery', 60 * 60 * 1000);
        const recovered = await resolver.getToken();
        expect(recovered).toBe('ghs_after_recovery');
      });
    });
  });

  describe('onUnauthorized', () => {
    describe('clears the cache so the next getToken re-mints and re-exchanges', () => {
      let callCountAfterFirst: number;
      let after: string;

      beforeEach(async () => {
        mockExchangeResponse('ghs_first', 60 * 60 * 1000);
        const resolver = buildResolver();
        await resolver.getToken();
        callCountAfterFirst = mockHttpClient.post.mock.calls.length;

        await resolver.onUnauthorized();

        mockExchangeResponse('ghs_second', 60 * 60 * 1000);
        after = await resolver.getToken();
      });

      it('exchanges once for the initial getToken', () => {
        expect(callCountAfterFirst).toBe(1);
      });

      it('returns the freshly minted token on the next getToken', () => {
        expect(after).toBe('ghs_second');
      });

      it('re-exchanges with the GitHub API after clearing the cache', () => {
        expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
      });
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
