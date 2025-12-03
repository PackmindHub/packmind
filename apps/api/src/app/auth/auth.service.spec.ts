import { JwtService } from '@nestjs/jwt';
import { createOrganizationId, createUserId } from '@packmind/types';
import { AuthService, GetMeResponse } from './auth.service';
import { JwtPayload } from './JwtPayload';

describe('AuthService - getMe method', () => {
  let mockJwtService: JwtService;
  let mockAccountsAdapter: jest.Mocked<{
    getOrganizationById: jest.Mock;
    getUserById: jest.Mock;
  }>;
  let authService: {
    logger: { log: jest.Mock; warn: jest.Mock };
    jwtService: JwtService;
    accountsAdapter: jest.Mocked<{
      getOrganizationById: jest.Mock;
      getUserById: jest.Mock;
    }>;
    getMe: (accessToken?: string) => Promise<GetMeResponse>;
  };

  const mockPayload: JwtPayload = {
    user: {
      name: 'testuser@packmind.com',
      userId: createUserId('1'),
    },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  beforeEach(() => {
    mockJwtService = {
      verify: jest.fn(),
    } as unknown as JwtService;

    mockAccountsAdapter = {
      getOrganizationById: jest.fn(),
      getUserById: jest.fn(),
    };

    // Create a minimal object with just the getMe method
    const baseAuthService = {
      logger: {
        log: jest.fn(),
        warn: jest.fn(),
      },
      jwtService: mockJwtService,
      accountsAdapter: mockAccountsAdapter,
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
      it('returns user with organizations list', async () => {
        mockJwtService.verify = jest.fn().mockReturnValue(mockPayload);
        mockAccountsAdapter.getUserById.mockResolvedValue({
          id: createUserId('1'),
          email: 'testuser@packmind.com',
          memberships: [
            {
              organizationId: createOrganizationId('org-1'),
              role: 'admin',
            },
          ],
        });

        mockAccountsAdapter.getOrganizationById.mockResolvedValue({
          id: createOrganizationId('org-1'),
          name: 'Test Organization',
          slug: 'test-organization',
        });

        const result = await authService.getMe('valid-jwt-token');

        expect(result).toEqual({
          authenticated: true,
          user: {
            id: '1',
            email: 'testuser@packmind.com',
          },
          organizations: [
            {
              organization: {
                id: 'org-1',
                name: 'Test Organization',
                slug: 'test-organization',
              },
              role: 'admin',
            },
          ],
        });
        expect(mockJwtService.verify).toHaveBeenCalledWith('valid-jwt-token');
        expect(mockAccountsAdapter.getUserById).toHaveBeenCalledWith({
          userId: createUserId('1'),
        });
      });

      it('returns user with multiple organizations', async () => {
        mockJwtService.verify = jest.fn().mockReturnValue(mockPayload);
        mockAccountsAdapter.getUserById.mockResolvedValue({
          id: createUserId('1'),
          email: 'testuser@packmind.com',
          memberships: [
            {
              organizationId: createOrganizationId('org-1'),
              role: 'admin',
            },
            {
              organizationId: createOrganizationId('org-2'),
              role: 'member',
            },
          ],
        });
        mockAccountsAdapter.getOrganizationById
          .mockResolvedValueOnce({
            id: createOrganizationId('org-1'),
            name: 'Organization 1',
            slug: 'org-1',
          })
          .mockResolvedValueOnce({
            id: createOrganizationId('org-2'),
            name: 'Organization 2',
            slug: 'org-2',
          });

        const result = await authService.getMe('valid-jwt-token');

        expect(result).toEqual({
          user: {
            id: '1',
            email: 'testuser@packmind.com',
          },
          organizations: [
            {
              organization: {
                id: 'org-1',
                name: 'Organization 1',
                slug: 'org-1',
              },
              role: 'admin',
            },
            {
              organization: {
                id: 'org-2',
                name: 'Organization 2',
                slug: 'org-2',
              },
              role: 'member',
            },
          ],
          authenticated: true,
        });
        expect(mockAccountsAdapter.getOrganizationById).toHaveBeenCalledTimes(
          2,
        );
      });

      it('returns user with empty organizations when user has no memberships', async () => {
        mockJwtService.verify = jest.fn().mockReturnValue(mockPayload);
        mockAccountsAdapter.getUserById.mockResolvedValue({
          id: createUserId('1'),
          email: 'testuser@packmind.com',
          memberships: [],
        });

        const result = await authService.getMe('valid-jwt-token');

        expect(result).toEqual({
          user: {
            id: '1',
            email: 'testuser@packmind.com',
          },
          organizations: [],
          authenticated: true,
        });
      });

      it('filters out null organizations when organization not found', async () => {
        mockJwtService.verify = jest.fn().mockReturnValue(mockPayload);
        mockAccountsAdapter.getUserById.mockResolvedValue({
          id: createUserId('1'),
          email: 'testuser@packmind.com',
          memberships: [
            {
              organizationId: createOrganizationId('org-1'),
              role: 'admin',
            },
            {
              organizationId: createOrganizationId('org-2'),
              role: 'member',
            },
          ],
        });
        mockAccountsAdapter.getOrganizationById
          .mockResolvedValueOnce({
            id: createOrganizationId('org-1'),
            name: 'Organization 1',
            slug: 'org-1',
          })
          .mockResolvedValueOnce(null); // org-2 not found

        const result = await authService.getMe('valid-jwt-token');

        expect(result).toEqual({
          user: {
            id: '1',
            email: 'testuser@packmind.com',
          },
          organizations: [
            {
              organization: {
                id: 'org-1',
                name: 'Organization 1',
                slug: 'org-1',
              },
              role: 'admin',
            },
          ],
          authenticated: true,
        });
        expect(authService.logger.warn).toHaveBeenCalledWith(
          'Organization not found',
          {
            organizationId: 'org-2',
          },
        );
      });
    });

    describe('when user is not found', () => {
      it('returns unauthenticated response', async () => {
        mockJwtService.verify = jest.fn().mockReturnValue(mockPayload);
        mockAccountsAdapter.getUserById.mockResolvedValue(null);

        const result = await authService.getMe('valid-jwt-token');

        expect(result).toEqual({
          message: 'User not found',
          authenticated: false,
        });
        expect(authService.logger.warn).toHaveBeenCalledWith('User not found', {
          userId: '1',
        });
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
