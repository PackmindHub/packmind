import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import {
  createUserId,
  createOrganizationId,
  OrganizationId,
  UserId,
  UserOrganizationRole,
} from '@packmind/accounts';
import { JwtPayload } from './JwtPayload';

describe('AuthService - getMe method', () => {
  let mockJwtService: JwtService;
  let mockAccountsHexa: jest.Mocked<{
    getOrganizationById: jest.Mock;
    getUserById: jest.Mock;
  }>;
  let authService: {
    logger: { log: jest.Mock; warn: jest.Mock };
    jwtService: JwtService;
    accountsHexa: jest.Mocked<{
      getOrganizationById: jest.Mock;
      getUserById: jest.Mock;
    }>;
    getMe: (accessToken?: string) => Promise<{
      user: {
        id: UserId;
        email: string;
      };
      organization: {
        id: OrganizationId;
        name: string;
        slug: string;
        role: UserOrganizationRole;
      };
    }>;
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

    mockAccountsHexa = {
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
      describe('when user has access to organization', () => {
        it('returns user payload', async () => {
          mockJwtService.verify = jest.fn().mockReturnValue(mockPayload);
          mockAccountsHexa.getUserById.mockResolvedValue({
            id: createUserId('1'),
            email: 'testuser@packmind.com',
            memberships: [
              {
                organizationId: createOrganizationId('org-1'),
                role: 'admin',
              },
            ],
          });

          mockAccountsHexa.getOrganizationById.mockResolvedValue({
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
            organization: {
              id: 'org-1',
              name: 'Test Organization',
              slug: 'test-organization',
              role: 'admin',
            },
          });
          expect(mockJwtService.verify).toHaveBeenCalledWith('valid-jwt-token');
          expect(mockAccountsHexa.getUserById).toHaveBeenCalledWith({
            userId: createUserId('1'),
          });
        });
      });

      describe('when user does not have access to organization in token', () => {
        it('returns unauthenticated', async () => {
          mockJwtService.verify = jest.fn().mockReturnValue(mockPayload);
          mockAccountsHexa.getUserById.mockResolvedValue({
            id: createUserId('1'),
            email: 'testuser@packmind.com',
            memberships: [
              {
                organizationId: createOrganizationId('org-2'),
                role: 'admin',
              },
            ],
          });

          const result = await authService.getMe('valid-jwt-token');

          expect(result).toEqual({
            message: 'User does not have access to the organization in token',
            authenticated: false,
          });
          expect(mockJwtService.verify).toHaveBeenCalledWith('valid-jwt-token');
          expect(mockAccountsHexa.getUserById).toHaveBeenCalledWith({
            userId: createUserId('1'),
          });
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
          mockAccountsHexa.getUserById.mockResolvedValue({
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
        it('returns authenticated with user organizations', async () => {
          const payloadWithoutOrg: JwtPayload = {
            user: {
              name: 'testuser@packmind.com',
              userId: createUserId('1'),
            },
            organization: undefined,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
          };

          mockJwtService.verify = jest.fn().mockReturnValue(payloadWithoutOrg);
          mockAccountsHexa.getUserById.mockResolvedValue({
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
          mockAccountsHexa.getOrganizationById
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
            message:
              'User is authenticated but has not selected an organization',
            authenticated: true,
          });
          expect(mockJwtService.verify).toHaveBeenCalledWith('valid-jwt-token');
          expect(mockAccountsHexa.getUserById).toHaveBeenCalledWith({
            userId: createUserId('1'),
          });
          expect(mockAccountsHexa.getOrganizationById).toHaveBeenCalledTimes(2);
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
