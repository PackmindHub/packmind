import { JwtService } from '@nestjs/jwt';
import { createOrganizationId, createUserId, User } from '@packmind/types';
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

describe('AuthService - signInSocial method', () => {
  let mockJwtService: JwtService;
  let mockAccountsAdapter: jest.Mocked<{
    getUserByEmail: jest.Mock;
    createSocialLoginUser: jest.Mock;
    createOrganization: jest.Mock;
    getOrganizationById: jest.Mock;
  }>;
  let signInSocial: (
    email: string,
  ) => Promise<ReturnType<AuthService['signInSocial']>>;

  beforeEach(() => {
    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    } as unknown as JwtService;

    mockAccountsAdapter = {
      getUserByEmail: jest.fn(),
      createSocialLoginUser: jest.fn(),
      createOrganization: jest.fn(),
      getOrganizationById: jest.fn(),
    };

    const baseAuthService = {
      logger: {
        log: jest.fn(),
        warn: jest.fn(),
      },
      jwtService: mockJwtService,
      accountsAdapter: mockAccountsAdapter,
    };

    signInSocial = AuthService.prototype.signInSocial.bind(baseAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when user exists with single organization', () => {
    let result: Awaited<ReturnType<typeof signInSocial>>;

    beforeEach(async () => {
      const existingUser: User = {
        id: createUserId('user-1'),
        email: 'user@example.com',
        passwordHash: 'hash',
        active: true,
        memberships: [
          {
            userId: createUserId('user-1'),
            organizationId: createOrganizationId('org-1'),
            role: 'admin',
          },
        ],
      };
      mockAccountsAdapter.getUserByEmail.mockResolvedValue(existingUser);
      mockAccountsAdapter.getOrganizationById.mockResolvedValue({
        id: createOrganizationId('org-1'),
        name: 'Test Org',
        slug: 'test-org',
      });
      result = await signInSocial('user@example.com');
    });

    it('returns isNewUser false', () => {
      expect(result.isNewUser).toBe(false);
    });

    it('returns organization', () => {
      expect(result.organization).toEqual({
        id: createOrganizationId('org-1'),
        name: 'Test Org',
        slug: 'test-org',
      });
    });

    it('returns access token', () => {
      expect(result.accessToken).toBe('mock-jwt-token');
    });

    it('does not create a new user', () => {
      expect(mockAccountsAdapter.createSocialLoginUser).not.toHaveBeenCalled();
    });
  });

  describe('when user exists with multiple organizations', () => {
    let result: Awaited<ReturnType<typeof signInSocial>>;

    beforeEach(async () => {
      const existingUser: User = {
        id: createUserId('user-1'),
        email: 'user@example.com',
        passwordHash: 'hash',
        active: true,
        memberships: [
          {
            userId: createUserId('user-1'),
            organizationId: createOrganizationId('org-1'),
            role: 'admin',
          },
          {
            userId: createUserId('user-1'),
            organizationId: createOrganizationId('org-2'),
            role: 'member',
          },
        ],
      };
      mockAccountsAdapter.getUserByEmail.mockResolvedValue(existingUser);
      mockAccountsAdapter.getOrganizationById
        .mockResolvedValueOnce({
          id: createOrganizationId('org-1'),
          name: 'Org 1',
          slug: 'org-1',
        })
        .mockResolvedValueOnce({
          id: createOrganizationId('org-2'),
          name: 'Org 2',
          slug: 'org-2',
        });
      result = await signInSocial('user@example.com');
    });

    it('returns organizations list', () => {
      expect(result.organizations).toEqual([
        {
          organization: {
            id: createOrganizationId('org-1'),
            name: 'Org 1',
            slug: 'org-1',
          },
          role: 'admin',
        },
        {
          organization: {
            id: createOrganizationId('org-2'),
            name: 'Org 2',
            slug: 'org-2',
          },
          role: 'member',
        },
      ]);
    });

    it('does not return a single organization', () => {
      expect(result.organization).toBeUndefined();
    });
  });

  describe('when user exists with no organizations', () => {
    let result: Awaited<ReturnType<typeof signInSocial>>;

    beforeEach(async () => {
      const existingUser: User = {
        id: createUserId('user-1'),
        email: 'user@example.com',
        passwordHash: null,
        active: true,
        memberships: [],
      };
      const userWithOrg: User = {
        ...existingUser,
        memberships: [
          {
            userId: createUserId('user-1'),
            organizationId: createOrganizationId('auto-org'),
            role: 'admin',
          },
        ],
      };
      mockAccountsAdapter.getUserByEmail
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(userWithOrg);
      mockAccountsAdapter.createOrganization.mockResolvedValue({
        id: createOrganizationId('auto-org'),
        name: 'example.com',
        slug: 'example-com',
      });
      mockAccountsAdapter.getOrganizationById.mockResolvedValue({
        id: createOrganizationId('auto-org'),
        name: 'example.com',
        slug: 'example-com',
      });
      result = await signInSocial('user@example.com');
    });

    it('creates a default organization', () => {
      expect(mockAccountsAdapter.createOrganization).toHaveBeenCalledWith({
        userId: createUserId('user-1'),
        name: 'example.com',
      });
    });

    it('returns the auto-created organization', () => {
      expect(result.organization).toEqual({
        id: createOrganizationId('auto-org'),
        name: 'example.com',
        slug: 'example-com',
      });
    });
  });

  describe('when user does not exist', () => {
    let result: Awaited<ReturnType<typeof signInSocial>>;

    beforeEach(async () => {
      const newUser: User = {
        id: createUserId('new-user'),
        email: 'new@example.com',
        passwordHash: null,
        active: true,
        memberships: [],
      };
      const userWithOrg: User = {
        ...newUser,
        memberships: [
          {
            userId: createUserId('new-user'),
            organizationId: createOrganizationId('new-org'),
            role: 'admin',
          },
        ],
      };
      mockAccountsAdapter.getUserByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(userWithOrg);
      mockAccountsAdapter.createSocialLoginUser.mockResolvedValue(newUser);
      mockAccountsAdapter.createOrganization.mockResolvedValue({
        id: createOrganizationId('new-org'),
        name: 'example.com',
        slug: 'example-com',
      });
      mockAccountsAdapter.getOrganizationById.mockResolvedValue({
        id: createOrganizationId('new-org'),
        name: 'example.com',
        slug: 'example-com',
      });
      result = await signInSocial('new@example.com');
    });

    it('returns isNewUser true', () => {
      expect(result.isNewUser).toBe(true);
    });

    it('creates a new user', () => {
      expect(mockAccountsAdapter.createSocialLoginUser).toHaveBeenCalledWith(
        'new@example.com',
      );
    });

    it('creates a default organization from email domain', () => {
      expect(mockAccountsAdapter.createOrganization).toHaveBeenCalledWith({
        userId: createUserId('new-user'),
        name: 'example.com',
      });
    });

    it('returns the new organization', () => {
      expect(result.organization).toEqual({
        id: createOrganizationId('new-org'),
        name: 'example.com',
        slug: 'example-com',
      });
    });
  });
});
