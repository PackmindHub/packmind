import { ApiKeyService, IJwtService } from './ApiKeyService';
import { User, createUserId } from '@packmind/types';
import { Organization, createOrganizationId } from '@packmind/types';
import { PackmindLogger, LogLevel } from '@packmind/logger';

// Mock JWT service
class MockJwtService implements IJwtService {
  private mockTokens: Map<string, Record<string, unknown>> = new Map();
  private tokenCounter = 0;

  sign(
    payload: Record<string, unknown>,
    options?: { expiresIn?: string },
  ): string {
    const token = `mock-jwt-${++this.tokenCounter}`;

    // Calculate expiration based on options
    let exp: number | undefined;
    if (options?.expiresIn === '90d') {
      exp = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60; // 90 days from now
    }

    this.mockTokens.set(token, { ...payload, exp });
    return token;
  }

  verify(token: string): Record<string, unknown> {
    if (token === 'expired-token') {
      throw new Error('TokenExpiredError: jwt expired');
    }

    if (token === 'invalid-token') {
      throw new Error('JsonWebTokenError: invalid token');
    }

    const payload = this.mockTokens.get(token);
    if (!payload) {
      throw new Error('JsonWebTokenError: invalid token');
    }

    // Check if token is expired
    if (
      payload.exp &&
      typeof payload.exp === 'number' &&
      Date.now() / 1000 > payload.exp
    ) {
      throw new Error('TokenExpiredError: jwt expired');
    }

    return payload;
  }

  // Helper method to create expired tokens for testing
  createExpiredToken(payload: Record<string, unknown>): string {
    const token = `expired-token-${++this.tokenCounter}`;
    this.mockTokens.set(token, {
      ...payload,
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    });
    return 'expired-token'; // Return the special expired token that verify() handles
  }
}

describe('ApiKeyService', () => {
  let apiKeyService: ApiKeyService;
  let mockJwtService: MockJwtService;
  let mockUser: User;
  let mockOrganization: Organization;
  let mockLogger: PackmindLogger;

  beforeEach(() => {
    mockJwtService = new MockJwtService();
    mockLogger = new PackmindLogger('ApiKeyService', LogLevel.ERROR); // Use ERROR to suppress logs in tests
    apiKeyService = new ApiKeyService(mockJwtService, mockLogger);

    const userId = createUserId('user-123');

    mockUser = {
      id: userId,
      email: 'testuser@packmind.com',
      passwordHash: 'hash',
      active: true,
      memberships: [
        {
          userId,
          organizationId: createOrganizationId('org-456'),
          role: 'admin',
        },
      ],
    };

    mockOrganization = {
      id: createOrganizationId('org-456'),
      name: 'Test Organization',
      slug: 'test-org',
    };
  });

  describe('generateApiKey', () => {
    it('returns a truthy string', () => {
      const host = 'http://localhost:3000';

      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        host,
      );

      expect(apiKey).toBeTruthy();
    });

    it('returns a valid API key that can be decoded', () => {
      const host = 'http://localhost:3000';

      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        host,
      );
      const decoded = apiKeyService.validateApiKey(apiKey);

      expect(decoded.isValid).toBe(true);
    });

    it('includes the correct host in the decoded payload', () => {
      const host = 'http://localhost:3000';

      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        host,
      );
      const decoded = apiKeyService.validateApiKey(apiKey);

      expect(decoded.payload.host).toBe(host);
    });

    it('returns an expiration date', () => {
      const host = 'http://localhost:3000';

      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        host,
      );
      const expiration = apiKeyService.getApiKeyExpiration(apiKey);

      expect(expiration).toBeInstanceOf(Date);
    });

    it('sets expiration approximately 90 days from now', () => {
      const host = 'http://localhost:3000';

      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        host,
      );
      const expiration = apiKeyService.getApiKeyExpiration(apiKey);
      const now = new Date();
      const expectedExpiration = new Date(
        now.getTime() + 90 * 24 * 60 * 60 * 1000,
      );
      const timeDiff = Math.abs(
        (expiration?.getTime() ?? 0) - expectedExpiration.getTime(),
      );

      expect(timeDiff).toBeLessThan(60 * 1000);
    });

    it('includes correct user name in JWT payload', () => {
      const host = 'http://localhost:3000';

      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        host,
      );
      const userInfo = apiKeyService.extractUserFromApiKey(apiKey);

      expect(userInfo?.user.name).toBe(mockUser.email);
    });

    it('includes correct user ID in JWT payload', () => {
      const host = 'http://localhost:3000';

      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        host,
      );
      const userInfo = apiKeyService.extractUserFromApiKey(apiKey);

      expect(userInfo?.user.userId).toBe(mockUser.id);
    });

    it('includes correct organization ID in JWT payload', () => {
      const host = 'http://localhost:3000';

      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        host,
      );
      const userInfo = apiKeyService.extractUserFromApiKey(apiKey);

      expect(userInfo?.organization.id).toBe(mockOrganization.id);
    });

    it('includes correct organization name in JWT payload', () => {
      const host = 'http://localhost:3000';

      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        host,
      );
      const userInfo = apiKeyService.extractUserFromApiKey(apiKey);

      expect(userInfo?.organization.name).toBe(mockOrganization.name);
    });

    it('includes correct organization slug in JWT payload', () => {
      const host = 'http://localhost:3000';

      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        host,
      );
      const userInfo = apiKeyService.extractUserFromApiKey(apiKey);

      expect(userInfo?.organization.slug).toBe(mockOrganization.slug);
    });

    it('includes correct organization role in JWT payload', () => {
      const host = 'http://localhost:3000';

      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        host,
      );
      const userInfo = apiKeyService.extractUserFromApiKey(apiKey);

      expect(userInfo?.organization.role).toBe('admin');
    });

    it('handles JWT service errors', () => {
      const faultyJwtService = {
        sign: () => {
          throw new Error('JWT service error');
        },
        verify: () => ({}),
      };

      const faultyService = new ApiKeyService(faultyJwtService, mockLogger);

      expect(() => {
        faultyService.generateApiKey(
          mockUser,
          mockOrganization,
          'admin',
          'http://localhost:3000',
        );
      }).toThrow('Failed to generate API key');
    });
  });

  describe('validateApiKey', () => {
    describe('when API key is valid', () => {
      it('returns isValid as true', () => {
        const host = 'http://localhost:3000';
        const apiKey = apiKeyService.generateApiKey(
          mockUser,
          mockOrganization,
          'admin',
          host,
        );

        const result = apiKeyService.validateApiKey(apiKey);

        expect(result.isValid).toBe(true);
      });

      it('returns the correct host in payload', () => {
        const host = 'http://localhost:3000';
        const apiKey = apiKeyService.generateApiKey(
          mockUser,
          mockOrganization,
          'admin',
          host,
        );

        const result = apiKeyService.validateApiKey(apiKey);

        expect(result.payload.host).toBe(host);
      });

      it('returns no error', () => {
        const host = 'http://localhost:3000';
        const apiKey = apiKeyService.generateApiKey(
          mockUser,
          mockOrganization,
          'admin',
          host,
        );

        const result = apiKeyService.validateApiKey(apiKey);

        expect(result.error).toBeUndefined();
      });
    });

    describe('when API key is malformed', () => {
      it('returns isValid as false', () => {
        const result = apiKeyService.validateApiKey('not-a-valid-api-key');

        expect(result.isValid).toBe(false);
      });

      it('returns an error containing decode failure message', () => {
        const result = apiKeyService.validateApiKey('not-a-valid-api-key');

        expect(result.error).toContain('Failed to decode API key');
      });
    });

    describe('when API key has expired JWT token', () => {
      let apiKey: string;

      beforeEach(() => {
        const expiredJwt = mockJwtService.createExpiredToken({
          user: { name: mockUser.email, userId: mockUser.id },
          organization: {
            id: mockOrganization.id,
            name: mockOrganization.name,
            slug: mockOrganization.slug,
          },
        });

        const apiKeyPayload = {
          host: 'http://localhost:3000',
          jwt: expiredJwt,
        };

        apiKey = Buffer.from(JSON.stringify(apiKeyPayload)).toString('base64');
      });

      it('returns isValid as false', () => {
        const result = apiKeyService.validateApiKey(apiKey);

        expect(result.isValid).toBe(false);
      });

      it('returns an error containing invalid or expired message', () => {
        const result = apiKeyService.validateApiKey(apiKey);

        expect(result.error).toContain('Invalid or expired JWT token');
      });
    });

    describe('when API key has invalid JWT token', () => {
      let apiKey: string;

      beforeEach(() => {
        const apiKeyPayload = {
          host: 'http://localhost:3000',
          jwt: 'invalid-token',
        };

        apiKey = Buffer.from(JSON.stringify(apiKeyPayload)).toString('base64');
      });

      it('returns isValid as false', () => {
        const result = apiKeyService.validateApiKey(apiKey);

        expect(result.isValid).toBe(false);
      });

      it('returns an error containing invalid or expired message', () => {
        const result = apiKeyService.validateApiKey(apiKey);

        expect(result.error).toContain('Invalid or expired JWT token');
      });
    });
  });

  describe('extractUserFromApiKey', () => {
    describe('when API key is valid', () => {
      let apiKey: string;

      beforeEach(() => {
        apiKey = apiKeyService.generateApiKey(
          mockUser,
          mockOrganization,
          'admin',
          'http://localhost:3000',
        );
      });

      it('returns non-null user info', () => {
        const userInfo = apiKeyService.extractUserFromApiKey(apiKey);

        expect(userInfo).not.toBeNull();
      });

      it('extracts correct user name', () => {
        const userInfo = apiKeyService.extractUserFromApiKey(apiKey);

        expect(userInfo?.user.name).toBe(mockUser.email);
      });

      it('extracts correct user ID', () => {
        const userInfo = apiKeyService.extractUserFromApiKey(apiKey);

        expect(userInfo?.user.userId).toBe(mockUser.id);
      });

      it('extracts correct organization ID', () => {
        const userInfo = apiKeyService.extractUserFromApiKey(apiKey);

        expect(userInfo?.organization.id).toBe(mockOrganization.id);
      });

      it('extracts correct organization name', () => {
        const userInfo = apiKeyService.extractUserFromApiKey(apiKey);

        expect(userInfo?.organization.name).toBe(mockOrganization.name);
      });

      it('extracts correct organization slug', () => {
        const userInfo = apiKeyService.extractUserFromApiKey(apiKey);

        expect(userInfo?.organization.slug).toBe(mockOrganization.slug);
      });
    });

    describe('when API key is invalid', () => {
      it('returns null', () => {
        const userInfo = apiKeyService.extractUserFromApiKey('invalid-api-key');

        expect(userInfo).toBeNull();
      });
    });

    describe('when API key has expired JWT', () => {
      it('returns null', () => {
        const expiredJwt = mockJwtService.createExpiredToken({
          user: { name: mockUser.email, userId: mockUser.id },
          organization: {
            id: mockOrganization.id,
            name: mockOrganization.name,
            slug: mockOrganization.slug,
          },
        });

        const apiKeyPayload = {
          host: 'http://localhost:3000',
          jwt: expiredJwt,
        };

        const apiKey = Buffer.from(JSON.stringify(apiKeyPayload)).toString(
          'base64',
        );

        const userInfo = apiKeyService.extractUserFromApiKey(apiKey);

        expect(userInfo).toBeNull();
      });
    });
  });

  describe('getApiKeyExpiration', () => {
    describe('when API key is valid', () => {
      let apiKey: string;

      beforeEach(() => {
        apiKey = apiKeyService.generateApiKey(
          mockUser,
          mockOrganization,
          'admin',
          'http://localhost:3000',
        );
      });

      it('returns a Date instance', () => {
        const expiration = apiKeyService.getApiKeyExpiration(apiKey);

        expect(expiration).toBeInstanceOf(Date);
      });

      it('returns a date in the future', () => {
        const expiration = apiKeyService.getApiKeyExpiration(apiKey);

        expect(expiration?.getTime()).toBeGreaterThan(Date.now());
      });
    });

    describe('when API key is invalid', () => {
      it('returns null', () => {
        const expiration = apiKeyService.getApiKeyExpiration('invalid-api-key');

        expect(expiration).toBeNull();
      });
    });

    describe('when API key has no expiration', () => {
      let apiKey: string;

      beforeEach(() => {
        const jwtWithoutExp = mockJwtService.sign({
          user: { name: mockUser.email, userId: mockUser.id },
          organization: {
            id: mockOrganization.id,
            name: mockOrganization.name,
            slug: mockOrganization.slug,
          },
        });

        const apiKeyPayload = {
          host: 'http://localhost:3000',
          jwt: jwtWithoutExp,
        };

        apiKey = Buffer.from(JSON.stringify(apiKeyPayload)).toString('base64');
      });

      it('returns null', () => {
        const expiration = apiKeyService.getApiKeyExpiration(apiKey);

        expect(expiration).toBeNull();
      });
    });
  });
});
