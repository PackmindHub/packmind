import { EnvCredentialsProvider } from './EnvCredentialsProvider';

function createTestApiKey(options: {
  host?: string;
  user?: { name: string; userId: string };
  organization?: { id: string; name: string; slug: string; role: string };
  exp?: number;
}): string {
  const jwtPayload = {
    user: options.user,
    organization: options.organization,
    exp: options.exp,
  };

  const jwtPayloadBase64 = Buffer.from(JSON.stringify(jwtPayload)).toString(
    'base64',
  );
  const jwt = `header.${jwtPayloadBase64}.signature`;

  const apiKeyPayload = {
    host: options.host ?? 'https://app.packmind.ai',
    jwt,
  };

  return Buffer.from(JSON.stringify(apiKeyPayload)).toString('base64');
}

describe('EnvCredentialsProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PACKMIND_API_KEY;
    delete process.env.PACKMIND_API_KEY_V3;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getSourceName', () => {
    describe('when no env variable is set', () => {
      it('defaults to PACKMIND_API_KEY', () => {
        const provider = new EnvCredentialsProvider();

        expect(provider.getSourceName()).toBe(
          'PACKMIND_API_KEY environment variable',
        );
      });
    });

    describe('when only PACKMIND_API_KEY_V3 is set', () => {
      it('returns the PACKMIND_API_KEY_V3 source name', () => {
        process.env.PACKMIND_API_KEY_V3 = createTestApiKey({});
        const provider = new EnvCredentialsProvider();

        expect(provider.getSourceName()).toBe(
          'PACKMIND_API_KEY_V3 environment variable',
        );
      });
    });

    describe('when PACKMIND_API_KEY is set', () => {
      it('returns the PACKMIND_API_KEY source name', () => {
        process.env.PACKMIND_API_KEY = createTestApiKey({});
        const provider = new EnvCredentialsProvider();

        expect(provider.getSourceName()).toBe(
          'PACKMIND_API_KEY environment variable',
        );
      });
    });

    describe('when both env variables are set', () => {
      it('prefers PACKMIND_API_KEY', () => {
        process.env.PACKMIND_API_KEY = createTestApiKey({});
        process.env.PACKMIND_API_KEY_V3 = createTestApiKey({});
        const provider = new EnvCredentialsProvider();

        expect(provider.getSourceName()).toBe(
          'PACKMIND_API_KEY environment variable',
        );
      });
    });
  });

  describe('hasCredentials', () => {
    describe('when no env variable is set', () => {
      it('returns false', () => {
        const provider = new EnvCredentialsProvider();

        expect(provider.hasCredentials()).toBe(false);
      });
    });

    describe('when env variables are empty', () => {
      it('returns false', () => {
        process.env.PACKMIND_API_KEY = '';
        process.env.PACKMIND_API_KEY_V3 = '';
        const provider = new EnvCredentialsProvider();

        expect(provider.hasCredentials()).toBe(false);
      });
    });

    describe('when env variables are whitespace only', () => {
      it('returns false', () => {
        process.env.PACKMIND_API_KEY = '   ';
        process.env.PACKMIND_API_KEY_V3 = '   ';
        const provider = new EnvCredentialsProvider();

        expect(provider.hasCredentials()).toBe(false);
      });
    });

    describe('when PACKMIND_API_KEY_V3 is set', () => {
      it('returns true', () => {
        process.env.PACKMIND_API_KEY_V3 = createTestApiKey({});
        const provider = new EnvCredentialsProvider();

        expect(provider.hasCredentials()).toBe(true);
      });
    });

    describe('when PACKMIND_API_KEY is set', () => {
      it('returns true', () => {
        process.env.PACKMIND_API_KEY = createTestApiKey({});
        const provider = new EnvCredentialsProvider();

        expect(provider.hasCredentials()).toBe(true);
      });
    });
  });

  describe('loadCredentials', () => {
    describe('when no env variable is set', () => {
      it('returns null', () => {
        const provider = new EnvCredentialsProvider();

        expect(provider.loadCredentials()).toBeNull();
      });
    });

    describe('when API key is invalid', () => {
      it('returns null', () => {
        process.env.PACKMIND_API_KEY = 'invalid-api-key';
        const provider = new EnvCredentialsProvider();

        expect(provider.loadCredentials()).toBeNull();
      });
    });

    it('returns credentials with host from API key', () => {
      process.env.PACKMIND_API_KEY_V3 = createTestApiKey({
        host: 'https://custom.host.com',
      });
      const provider = new EnvCredentialsProvider();

      const credentials = provider.loadCredentials();

      expect(credentials?.host).toBe('https://custom.host.com');
    });

    it('returns credentials with user name from JWT', () => {
      process.env.PACKMIND_API_KEY_V3 = createTestApiKey({
        user: { name: 'John Doe', userId: 'user-123' },
      });
      const provider = new EnvCredentialsProvider();

      const credentials = provider.loadCredentials();

      expect(credentials?.userName).toBe('John Doe');
    });

    it('returns credentials with organization name from JWT', () => {
      process.env.PACKMIND_API_KEY_V3 = createTestApiKey({
        organization: {
          id: 'org-123',
          name: 'My Organization',
          slug: 'my-org',
          role: 'admin',
        },
      });
      const provider = new EnvCredentialsProvider();

      const credentials = provider.loadCredentials();

      expect(credentials?.organizationName).toBe('My Organization');
    });

    it('returns credentials with expiration date from JWT', () => {
      const expTimestamp = Math.floor(Date.now() / 1000) + 3600;
      process.env.PACKMIND_API_KEY_V3 = createTestApiKey({ exp: expTimestamp });
      const provider = new EnvCredentialsProvider();

      const credentials = provider.loadCredentials();

      expect(credentials?.expiresAt).toEqual(new Date(expTimestamp * 1000));
    });

    it('returns credentials with the original API key', () => {
      const apiKey = createTestApiKey({});
      process.env.PACKMIND_API_KEY_V3 = apiKey;
      const provider = new EnvCredentialsProvider();

      const credentials = provider.loadCredentials();

      expect(credentials?.apiKey).toBe(apiKey);
    });

    describe('when JWT has no exp claim', () => {
      it('returns undefined expiresAt', () => {
        process.env.PACKMIND_API_KEY_V3 = createTestApiKey({});
        const provider = new EnvCredentialsProvider();

        const credentials = provider.loadCredentials();

        expect(credentials?.expiresAt).toBeUndefined();
      });
    });

    describe('when both env variables are set', () => {
      it('returns the API key from PACKMIND_API_KEY', () => {
        const preferredKey = createTestApiKey({
          host: 'https://preferred.host.com',
        });
        const fallbackKey = createTestApiKey({
          host: 'https://fallback.host.com',
        });
        process.env.PACKMIND_API_KEY = preferredKey;
        process.env.PACKMIND_API_KEY_V3 = fallbackKey;
        const provider = new EnvCredentialsProvider();

        const credentials = provider.loadCredentials();

        expect(credentials?.apiKey).toBe(preferredKey);
        expect(credentials?.host).toBe('https://preferred.host.com');
      });
    });

    describe('when only PACKMIND_API_KEY_V3 is set', () => {
      it('falls back to PACKMIND_API_KEY_V3', () => {
        const fallbackKey = createTestApiKey({
          host: 'https://fallback.host.com',
        });
        process.env.PACKMIND_API_KEY_V3 = fallbackKey;
        const provider = new EnvCredentialsProvider();

        const credentials = provider.loadCredentials();

        expect(credentials?.apiKey).toBe(fallbackKey);
        expect(credentials?.host).toBe('https://fallback.host.com');
      });
    });
  });
});
