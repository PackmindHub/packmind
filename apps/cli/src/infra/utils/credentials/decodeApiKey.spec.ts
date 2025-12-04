import { decodeApiKey } from './decodeApiKey';

function createTestApiKey(options: {
  host?: string;
  jwt?: string;
  user?: { name: string; userId: string };
  organization?: { id: string; name: string; slug: string; role: string };
  exp?: number;
  iat?: number;
}): string {
  const jwtPayload = {
    user: options.user,
    organization: options.organization,
    exp: options.exp,
    iat: options.iat,
  };

  const jwtPayloadBase64 = Buffer.from(JSON.stringify(jwtPayload)).toString(
    'base64',
  );
  const jwt = options.jwt ?? `header.${jwtPayloadBase64}.signature`;

  const apiKeyPayload = {
    host: options.host ?? 'https://app.packmind.ai',
    jwt,
  };

  return Buffer.from(JSON.stringify(apiKeyPayload)).toString('base64');
}

describe('decodeApiKey', () => {
  describe('when given a valid API key', () => {
    it('extracts the host', () => {
      const apiKey = createTestApiKey({ host: 'https://custom.host.com' });

      const result = decodeApiKey(apiKey);

      expect(result?.host).toBe('https://custom.host.com');
    });

    it('extracts user information from JWT', () => {
      const apiKey = createTestApiKey({
        user: { name: 'John Doe', userId: 'user-123' },
      });

      const result = decodeApiKey(apiKey);

      expect(result?.jwt.user).toEqual({
        name: 'John Doe',
        userId: 'user-123',
      });
    });

    it('extracts organization information from JWT', () => {
      const apiKey = createTestApiKey({
        organization: {
          id: 'org-123',
          name: 'My Organization',
          slug: 'my-org',
          role: 'admin',
        },
      });

      const result = decodeApiKey(apiKey);

      expect(result?.jwt.organization).toEqual({
        id: 'org-123',
        name: 'My Organization',
        slug: 'my-org',
        role: 'admin',
      });
    });

    it('extracts expiration timestamp from JWT', () => {
      const expTimestamp = Math.floor(Date.now() / 1000) + 3600;
      const apiKey = createTestApiKey({ exp: expTimestamp });

      const result = decodeApiKey(apiKey);

      expect(result?.jwt.exp).toBe(expTimestamp);
    });

    it('handles API key with whitespace', () => {
      const apiKey = createTestApiKey({ host: 'https://app.packmind.ai' });

      const result = decodeApiKey(`  ${apiKey}  `);

      expect(result?.host).toBe('https://app.packmind.ai');
    });
  });

  describe('when given an invalid API key', () => {
    it('returns null for empty string', () => {
      const result = decodeApiKey('');

      expect(result).toBeNull();
    });

    it('returns null for non-base64 string', () => {
      const result = decodeApiKey('not-valid-base64!!!');

      expect(result).toBeNull();
    });

    it('returns null for base64 that is not valid JSON', () => {
      const invalidBase64 = Buffer.from('not json').toString('base64');

      const result = decodeApiKey(invalidBase64);

      expect(result).toBeNull();
    });

    it('returns null when host is missing', () => {
      const payload = { jwt: 'some.jwt.token' };
      const apiKey = Buffer.from(JSON.stringify(payload)).toString('base64');

      const result = decodeApiKey(apiKey);

      expect(result).toBeNull();
    });

    it('returns null when jwt is missing', () => {
      const payload = { host: 'https://app.packmind.ai' };
      const apiKey = Buffer.from(JSON.stringify(payload)).toString('base64');

      const result = decodeApiKey(apiKey);

      expect(result).toBeNull();
    });

    it('returns host with empty jwt when JWT format is invalid', () => {
      const payload = {
        host: 'https://app.packmind.ai',
        jwt: 'invalid-jwt-format',
      };
      const apiKey = Buffer.from(JSON.stringify(payload)).toString('base64');

      const result = decodeApiKey(apiKey);

      expect(result?.host).toBe('https://app.packmind.ai');
      expect(result?.jwt).toEqual({});
    });
  });
});
