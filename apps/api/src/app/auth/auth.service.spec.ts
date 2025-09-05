import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import {
  createUserId,
  createOrganizationId,
  OrganizationId,
  UserId,
} from '@packmind/accounts';
import { JwtPayload } from './JwtPayload';

describe('AuthService - getMe method', () => {
  let mockJwtService: JwtService;
  let mockAccountsHexa: jest.Mocked<{ getOrganizationById: jest.Mock }>;
  let authService: {
    logger: { log: jest.Mock; warn: jest.Mock };
    jwtService: JwtService;
    accountsHexa: jest.Mocked<{ getOrganizationById: jest.Mock }>;
    getMe: (accessToken?: string) => Promise<{
      user: { id: UserId; username: string; organizationId: OrganizationId };
      organization: { id: OrganizationId; name: string; slug: string };
    }>;
  };

  const mockPayload: JwtPayload = {
    user: {
      name: 'testuser',
      userId: createUserId('1'),
    },
    organization: {
      id: createOrganizationId('org-1'),
      name: 'Test Organization',
      slug: 'test-organization',
    },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  beforeEach(() => {
    mockJwtService = {
      verify: jest.fn(),
    } as unknown as JwtService;

    mockAccountsHexa = {
      getOrganizationById: jest.fn(),
    };

    // Create a minimal object with just the getMe method
    const baseAuthService = {
      logger: {
        log: jest.fn(),
        warn: jest.fn(),
      },
      jwtService: mockJwtService,
      accountsHexa: mockAccountsHexa,
    };

    // Bind the actual getMe method from AuthService prototype
    authService = {
      ...baseAuthService,
      getMe: AuthService.prototype.getMe.bind(baseAuthService),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    describe('when valid token is provided', () => {
      it('returns user payload', async () => {
        mockJwtService.verify = jest.fn().mockReturnValue(mockPayload);

        const result = await authService.getMe('valid-jwt-token');

        expect(result).toEqual({
          authenticated: true,
          user: {
            id: '1',
            username: 'testuser',
            organizationId: 'org-1',
          },
          organization: {
            id: 'org-1',
            name: 'Test Organization',
            slug: 'test-organization',
          },
        });
        expect(mockJwtService.verify).toHaveBeenCalledWith('valid-jwt-token');
        expect(mockAccountsHexa.getOrganizationById).not.toHaveBeenCalled();
      });
    });

    describe('when no token is provided', () => {
      it('returns unauthenticated response', async () => {
        const result = await authService.getMe();

        expect(result).toEqual({
          message: 'No valid access token found',
          authenticated: false,
        });
        expect(mockJwtService.verify).not.toHaveBeenCalled();
      });
    });

    describe('when empty token is provided', () => {
      it('returns unauthenticated response', async () => {
        const result = await authService.getMe('');

        expect(result).toEqual({
          message: 'No valid access token found',
          authenticated: false,
        });
        expect(mockJwtService.verify).not.toHaveBeenCalled();
      });
    });

    describe('when undefined token is provided', () => {
      it('returns unauthenticated response', async () => {
        const result = await authService.getMe(undefined);

        expect(result).toEqual({
          message: 'No valid access token found',
          authenticated: false,
        });
        expect(mockJwtService.verify).not.toHaveBeenCalled();
      });
    });

    describe('when token verification fails', () => {
      it('returns error response', async () => {
        mockJwtService.verify = jest.fn().mockImplementation(() => {
          throw new Error('Invalid token');
        });

        const result = await authService.getMe('invalid-jwt-token');

        expect(result).toEqual({
          message: 'Invalid or expired access token',
          authenticated: false,
        });
        expect(mockJwtService.verify).toHaveBeenCalledWith('invalid-jwt-token');
      });
    });

    describe('when token is expired', () => {
      it('returns error response', async () => {
        mockJwtService.verify = jest.fn().mockImplementation(() => {
          throw new Error('Token expired');
        });

        const result = await authService.getMe('expired-jwt-token');

        expect(result).toEqual({
          message: 'Invalid or expired access token',
          authenticated: false,
        });
        expect(mockJwtService.verify).toHaveBeenCalledWith('expired-jwt-token');
      });
    });

    describe('when token is malformed', () => {
      it('returns error response', async () => {
        mockJwtService.verify = jest.fn().mockImplementation(() => {
          throw new Error('Malformed token');
        });

        const result = await authService.getMe('malformed-token');

        expect(result).toEqual({
          message: 'Invalid or expired access token',
          authenticated: false,
        });
        expect(mockJwtService.verify).toHaveBeenCalledWith('malformed-token');
      });
    });
  });
});
