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
    it('generates a valid API key', () => {
      const host = 'http://localhost:3000';

      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        host,
      );

      expect(apiKey).toBeTruthy();
      expect(typeof apiKey).toBe('string');

      // Decode and verify the API key structure
      const decoded = apiKeyService.validateApiKey(apiKey);
      expect(decoded.isValid).toBe(true);
      expect(decoded.payload.host).toBe(host);
    });

    it('generates API keys with 3-month expiration', () => {
      const host = 'http://localhost:3000';

      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        host,
      );
      const expiration = apiKeyService.getApiKeyExpiration(apiKey);

      expect(expiration).toBeInstanceOf(Date);

      // Check that expiration is approximately 90 days from now (allow some tolerance)
      if (expiration) {
        const now = new Date();
        const expectedExpiration = new Date(
          now.getTime() + 90 * 24 * 60 * 60 * 1000,
        );
        const timeDiff = Math.abs(
          expiration.getTime() - expectedExpiration.getTime(),
        );

        // Allow 1 minute tolerance
        expect(timeDiff).toBeLessThan(60 * 1000);
      }
    });

    it('includes correct user and organization info in JWT payload', () => {
      const host = 'http://localhost:3000';

      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        host,
      );
      const userInfo = apiKeyService.extractUserFromApiKey(apiKey);

      expect(userInfo).not.toBeNull();
      if (userInfo) {
        expect(userInfo.user.name).toBe(mockUser.email);
        expect(userInfo.user.userId).toBe(mockUser.id);
        expect(userInfo.organization.id).toBe(mockOrganization.id);
        expect(userInfo.organization.name).toBe(mockOrganization.name);
        expect(userInfo.organization.slug).toBe(mockOrganization.slug);
        expect(userInfo.organization.role).toBe('admin');
      }
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
    it('validates a correct API key', () => {
      const host = 'http://localhost:3000';
      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        host,
      );

      const result = apiKeyService.validateApiKey(apiKey);

      expect(result.isValid).toBe(true);
      expect(result.payload.host).toBe(host);
      expect(result.error).toBeUndefined();
    });

    it('rejects malformed API keys', () => {
      const result = apiKeyService.validateApiKey('not-a-valid-api-key');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Failed to decode API key');
    });

    it('rejects API keys with expired JWT tokens', () => {
      // Create an API key with expired JWT
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

      const result = apiKeyService.validateApiKey(apiKey);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid or expired JWT token');
    });

    it('rejects API keys with invalid JWT tokens', () => {
      const apiKeyPayload = {
        host: 'http://localhost:3000',
        jwt: 'invalid-token',
      };

      const apiKey = Buffer.from(JSON.stringify(apiKeyPayload)).toString(
        'base64',
      );

      const result = apiKeyService.validateApiKey(apiKey);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid or expired JWT token');
    });
  });

  describe('extractUserFromApiKey', () => {
    it('extracts user info from valid API key', () => {
      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        'http://localhost:3000',
      );

      const userInfo = apiKeyService.extractUserFromApiKey(apiKey);

      expect(userInfo).not.toBeNull();
      if (userInfo) {
        expect(userInfo.user.name).toBe(mockUser.email);
        expect(userInfo.user.userId).toBe(mockUser.id);
        expect(userInfo.organization.id).toBe(mockOrganization.id);
        expect(userInfo.organization.name).toBe(mockOrganization.name);
        expect(userInfo.organization.slug).toBe(mockOrganization.slug);
      }
    });

    it('returns null for invalid API key', () => {
      const userInfo = apiKeyService.extractUserFromApiKey('invalid-api-key');

      expect(userInfo).toBeNull();
    });

    it('returns null for API key with expired JWT', () => {
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

  describe('getApiKeyExpiration', () => {
    it('returns expiration date for valid API key', () => {
      const apiKey = apiKeyService.generateApiKey(
        mockUser,
        mockOrganization,
        'admin',
        'http://localhost:3000',
      );

      const expiration = apiKeyService.getApiKeyExpiration(apiKey);

      expect(expiration).toBeInstanceOf(Date);
      if (expiration) {
        expect(expiration.getTime()).toBeGreaterThan(Date.now());
      }
    });

    it('returns null for invalid API key', () => {
      const expiration = apiKeyService.getApiKeyExpiration('invalid-api-key');

      expect(expiration).toBeNull();
    });

    it('returns null for API key without expiration', () => {
      // Create a JWT without expiration
      const jwtWithoutExp = mockJwtService.sign({
        user: { name: mockUser.email, userId: mockUser.id },
        organization: {
          id: mockOrganization.id,
          name: mockOrganization.name,
          slug: mockOrganization.slug,
        },
      }); // No expiresIn option

      const apiKeyPayload = {
        host: 'http://localhost:3000',
        jwt: jwtWithoutExp,
      };

      const apiKey = Buffer.from(JSON.stringify(apiKeyPayload)).toString(
        'base64',
      );

      const expiration = apiKeyService.getApiKeyExpiration(apiKey);

      expect(expiration).toBeNull();
    });
  });
});
