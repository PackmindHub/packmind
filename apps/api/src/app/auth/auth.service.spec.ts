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
    organization: {
      id: createOrganizationId('org-1'),
      name: 'Test Organization',
      slug: 'test-organization',
      role: 'admin',
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
      describe('when user has access to organization', () => {
        let result: GetMeResponse;

        beforeEach(async () => {
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
          result = await authService.getMe('valid-jwt-token');
        });

        it('returns authenticated user with organization', () => {
          expect(result).toEqual({
            authenticated: true,
            user: {
              id: '1',
              email: 'testuser@packmind.com',
            },
            organization: {
              id: 'org-1',
              name: 'Test Organization',
              slug: 'test-organization',
              role: 'admin',
            },
          });
        });

        it('verifies the JWT token', () => {
          expect(mockJwtService.verify).toHaveBeenCalledWith('valid-jwt-token');
        });

        it('fetches user by ID', () => {
          expect(mockAccountsAdapter.getUserById).toHaveBeenCalledWith({
            userId: createUserId('1'),
          });
        });
      });

      describe('when user does not have access to organization in token', () => {
        let result: GetMeResponse;

        beforeEach(async () => {
          mockJwtService.verify = jest.fn().mockReturnValue(mockPayload);
          mockAccountsAdapter.getUserById.mockResolvedValue({
            id: createUserId('1'),
            email: 'testuser@packmind.com',
            memberships: [
              {
                organizationId: createOrganizationId('org-2'),
                role: 'admin',
              },
            ],
          });
          result = await authService.getMe('valid-jwt-token');
        });

        it('returns unauthenticated response', () => {
          expect(result).toEqual({
            message: 'User does not have access to the organization in token',
            authenticated: false,
          });
        });

        it('verifies the JWT token', () => {
          expect(mockJwtService.verify).toHaveBeenCalledWith('valid-jwt-token');
        });

        it('fetches user by ID', () => {
          expect(mockAccountsAdapter.getUserById).toHaveBeenCalledWith({
            userId: createUserId('1'),
          });
        });

        it('logs a warning', () => {
          expect(authService.logger.warn).toHaveBeenCalledWith(
            'User does not have access to organization',
            {
              userId: '1',
              organizationId: 'org-1',
            },
          );
        });
      });

      describe('when user has no memberships', () => {
        it('returns unauthenticated', async () => {
          mockJwtService.verify = jest.fn().mockReturnValue(mockPayload);
          mockAccountsAdapter.getUserById.mockResolvedValue({
            id: createUserId('1'),
            email: 'testuser@packmind.com',
            memberships: [],
          });

          const result = await authService.getMe('valid-jwt-token');

          expect(result).toEqual({
            message: 'User does not have access to the organization in token',
            authenticated: false,
          });
        });
      });

      describe('when token has no organization', () => {
        const payloadWithoutOrg: JwtPayload = {
          user: {
            name: 'testuser@packmind.com',
            userId: createUserId('1'),
          },
          organization: null,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        };
        let result: GetMeResponse;

        beforeEach(async () => {
          mockJwtService.verify = jest.fn().mockReturnValue(payloadWithoutOrg);
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
          result = await authService.getMe('valid-jwt-token');
        });

        it('returns authenticated with user organizations list', () => {
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
            message:
              'User is authenticated but has not selected an organization',
            authenticated: true,
          });
        });

        it('verifies the JWT token', () => {
          expect(mockJwtService.verify).toHaveBeenCalledWith('valid-jwt-token');
        });

        it('fetches user by ID', () => {
          expect(mockAccountsAdapter.getUserById).toHaveBeenCalledWith({
            userId: createUserId('1'),
          });
        });

        it('fetches all user organizations', () => {
          expect(mockAccountsAdapter.getOrganizationById).toHaveBeenCalledTimes(
            2,
          );
        });

        it('logs the multi-organization state', () => {
          expect(authService.logger.log).toHaveBeenCalledWith(
            'User is authenticated but has not selected an organization',
            {
              userId: '1',
            },
          );
        });
      });
    });

    describe('when no token is provided', () => {
      let result: GetMeResponse;

      beforeEach(async () => {
        result = await authService.getMe();
      });

      it('returns unauthenticated response', () => {
        expect(result).toEqual({
          message: 'No valid access token found',
          authenticated: false,
        });
      });

      it('does not verify token', () => {
        expect(mockJwtService.verify).not.toHaveBeenCalled();
      });
    });

    describe('when empty token is provided', () => {
      let result: GetMeResponse;

      beforeEach(async () => {
        result = await authService.getMe('');
      });

      it('returns unauthenticated response', () => {
        expect(result).toEqual({
          message: 'No valid access token found',
          authenticated: false,
        });
      });

      it('does not verify token', () => {
        expect(mockJwtService.verify).not.toHaveBeenCalled();
      });
    });

    describe('when undefined token is provided', () => {
      let result: GetMeResponse;

      beforeEach(async () => {
        result = await authService.getMe(undefined);
      });

      it('returns unauthenticated response', () => {
        expect(result).toEqual({
          message: 'No valid access token found',
          authenticated: false,
        });
      });

      it('does not verify token', () => {
        expect(mockJwtService.verify).not.toHaveBeenCalled();
      });
    });

    describe('when token verification fails', () => {
      let result: GetMeResponse;

      beforeEach(async () => {
        mockJwtService.verify = jest.fn().mockImplementation(() => {
          throw new Error('Invalid token');
        });
        result = await authService.getMe('invalid-jwt-token');
      });

      it('returns error response', () => {
        expect(result).toEqual({
          message: 'Invalid or expired access token',
          authenticated: false,
        });
      });

      it('attempts to verify the token', () => {
        expect(mockJwtService.verify).toHaveBeenCalledWith('invalid-jwt-token');
      });
    });

    describe('when token is expired', () => {
      let result: GetMeResponse;

      beforeEach(async () => {
        mockJwtService.verify = jest.fn().mockImplementation(() => {
          throw new Error('Token expired');
        });
        result = await authService.getMe('expired-jwt-token');
      });

      it('returns error response', () => {
        expect(result).toEqual({
          message: 'Invalid or expired access token',
          authenticated: false,
        });
      });

      it('attempts to verify the token', () => {
        expect(mockJwtService.verify).toHaveBeenCalledWith('expired-jwt-token');
      });
    });

    describe('when token is malformed', () => {
      let result: GetMeResponse;

      beforeEach(async () => {
        mockJwtService.verify = jest.fn().mockImplementation(() => {
          throw new Error('Malformed token');
        });
        result = await authService.getMe('malformed-token');
      });

      it('returns error response', () => {
        expect(result).toEqual({
          message: 'Invalid or expired access token',
          authenticated: false,
        });
      });

      it('attempts to verify the token', () => {
        expect(mockJwtService.verify).toHaveBeenCalledWith('malformed-token');
      });
    });
  });
});
