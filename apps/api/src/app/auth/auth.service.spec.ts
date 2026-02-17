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
    getUserById: jest.Mock;
    createSocialLoginUser: jest.Mock;
    addSocialProvider: jest.Mock;
    createOrganization: jest.Mock;
    getOrganizationById: jest.Mock;
    getOrganizationByName: jest.Mock;
  }>;
  let signInSocial: (
    ...args: Parameters<AuthService['signInSocial']>
  ) => Promise<ReturnType<AuthService['signInSocial']>>;

  beforeEach(() => {
    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    } as unknown as JwtService;

    mockAccountsAdapter = {
      getUserByEmail: jest.fn(),
      getUserById: jest.fn(),
      createSocialLoginUser: jest.fn(),
      addSocialProvider: jest.fn(),
      createOrganization: jest.fn(),
      getOrganizationById: jest.fn(),
      getOrganizationByName: jest.fn().mockResolvedValue(null),
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
      result = await signInSocial('user@example.com', 'GoogleOAuth');
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

    it('tracks the social provider', () => {
      expect(mockAccountsAdapter.addSocialProvider).toHaveBeenCalledWith(
        createUserId('user-1'),
        'GoogleOAuth',
      );
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
      result = await signInSocial('user@example.com', 'GoogleOAuth');
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
      mockAccountsAdapter.getUserByEmail.mockResolvedValue(existingUser);
      result = await signInSocial('user@example.com', 'GoogleOAuth');
    });

    it('does not auto-create an organization', () => {
      expect(mockAccountsAdapter.createOrganization).not.toHaveBeenCalled();
    });

    it('does not refresh user memberships', () => {
      expect(mockAccountsAdapter.getUserById).not.toHaveBeenCalled();
    });

    it('returns no organization', () => {
      expect(result.organization).toBeUndefined();
    });
  });

  describe('when user does not exist', () => {
    let result: Awaited<ReturnType<typeof signInSocial>>;

    beforeEach(async () => {
      const newUser: User = {
        id: createUserId('new-user'),
        email: 'paul@example.com',
        passwordHash: null,
        active: true,
        memberships: [],
      };
      const createdOrg = {
        id: createOrganizationId('new-org'),
        name: "paul's organization",
        slug: 'pauls-organization',
      };
      mockAccountsAdapter.getUserByEmail.mockResolvedValueOnce(null);
      mockAccountsAdapter.createSocialLoginUser.mockResolvedValue(newUser);
      mockAccountsAdapter.getOrganizationByName.mockResolvedValue(null);
      mockAccountsAdapter.createOrganization.mockResolvedValue(createdOrg);
      result = await signInSocial('paul@example.com', 'GoogleOAuth');
    });

    it('returns isNewUser true', () => {
      expect(result.isNewUser).toBe(true);
    });

    it('creates a new user with provider', () => {
      expect(mockAccountsAdapter.createSocialLoginUser).toHaveBeenCalledWith(
        'paul@example.com',
        'GoogleOAuth',
      );
    });

    it('auto-creates an organization with name derived from email', () => {
      expect(mockAccountsAdapter.createOrganization).toHaveBeenCalledWith({
        userId: createUserId('new-user'),
        name: "paul's organization",
      });
    });

    it('returns the created organization', () => {
      expect(result.organization).toEqual({
        id: createOrganizationId('new-org'),
        name: "paul's organization",
        slug: 'pauls-organization',
      });
    });

    it('includes organization in JWT payload', () => {
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          organization: {
            id: createOrganizationId('new-org'),
            name: "paul's organization",
            slug: 'pauls-organization',
            role: 'admin',
          },
        }),
      );
    });

    describe('when org name already exists', () => {
      beforeEach(async () => {
        const newUser: User = {
          id: createUserId('new-user-2'),
          email: 'paul@other.com',
          passwordHash: null,
          active: true,
          memberships: [],
        };
        const createdOrg = {
          id: createOrganizationId('new-org-2'),
          name: "paul's organization 2",
          slug: 'pauls-organization-2',
        };
        mockAccountsAdapter.getUserByEmail.mockResolvedValueOnce(null);
        mockAccountsAdapter.createSocialLoginUser.mockResolvedValue(newUser);
        mockAccountsAdapter.getOrganizationByName
          .mockResolvedValueOnce({ id: 'existing' })
          .mockResolvedValueOnce(null);
        mockAccountsAdapter.createOrganization.mockResolvedValue(createdOrg);
        result = await signInSocial('paul@other.com', 'GoogleOAuth');
      });

      it('creates organization with unique suffixed name', () => {
        expect(mockAccountsAdapter.createOrganization).toHaveBeenCalledWith({
          userId: createUserId('new-user-2'),
          name: "paul's organization 2",
        });
      });
    });
  });
});
