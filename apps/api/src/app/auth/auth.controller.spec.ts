import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  User,
  createOrganizationId,
  Organization,
  createUserId,
} from '@packmind/types';
import {
  SignInUserCommand,
  CheckEmailAvailabilityCommand,
  CheckEmailAvailabilityResponse,
  SignUpWithOrganizationCommand,
} from '@packmind/accounts';
import {
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Configuration } from '@packmind/node-utils';

// Mock only Configuration, preserve other exports
jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

describe('AuthController', () => {
  let controller: AuthController;

  // Mock NestJS Logger to suppress output during tests
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'verbose').mockImplementation(jest.fn());
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const mockUser: User = {
    id: createUserId('1'),
    email: 'testuser@packmind.com',
    passwordHash: 'hashedPassword',
    active: true,
    memberships: [
      {
        userId: createUserId('1'),
        organizationId: createOrganizationId('org-1'),
        role: 'admin',
      },
    ],
  };

  const mockOrganization: Organization = {
    id: createOrganizationId('org-1'),
    name: 'Test Organization',
    slug: 'test-organization',
  };

  const mockSignInResponse = {
    user: {
      id: '1',
      email: 'testuser@packmind.com',
      active: true,
      memberships: [
        {
          userId: createUserId('1'),
          organizationId: createOrganizationId('org-1'),
          role: 'admin',
        },
      ],
    },
    organization: {
      id: createOrganizationId('org-1'),
      name: 'Test Organization',
      slug: 'test-org',
      role: 'admin',
    },
    accessToken: 'mock-jwt-token',
  };

  const mockAuthService = {
    signUp: jest.fn(),
    signIn: jest.fn(),
    getMe: jest.fn(),
    checkEmailAvailability: jest.fn(),
    activateAccount: jest.fn(),
    validateInvitationToken: jest.fn(),
  };

  const mockResponse = {
    cookie: jest.fn(),
  } as unknown as jest.Mocked<Response>;

  const mockConfiguration = Configuration as jest.Mocked<typeof Configuration>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    const signUpRequest: SignUpWithOrganizationCommand = {
      email: 'testuser@packmind.com',
      password: 'password123',
    };

    describe('with valid request', () => {
      const mockSignUpResponse = {
        user: mockUser,
        organization: mockOrganization,
      };
      let result: Awaited<ReturnType<typeof controller.signUp>>;

      beforeEach(async () => {
        mockAuthService.signUp.mockResolvedValue(mockSignUpResponse);
        result = await controller.signUp(signUpRequest);
      });

      it('returns the user and organization', () => {
        expect(result).toEqual(mockSignUpResponse);
      });

      it('calls authService.signUp with the request', () => {
        expect(mockAuthService.signUp).toHaveBeenCalledWith(signUpRequest);
      });
    });

    describe('when email already exists', () => {
      beforeEach(() => {
        mockAuthService.signUp.mockRejectedValue(
          new ConflictException('Email already exists'),
        );
      });

      it('throws ConflictException', async () => {
        await expect(controller.signUp(signUpRequest)).rejects.toThrow(
          ConflictException,
        );
      });

      it('calls authService.signUp with the request', async () => {
        await controller.signUp(signUpRequest).catch(() => {
          /* noop */
        });
        expect(mockAuthService.signUp).toHaveBeenCalledWith(signUpRequest);
      });
    });

    describe('when organization name is invalid', () => {
      beforeEach(() => {
        mockAuthService.signUp.mockRejectedValue(
          new BadRequestException('Organization name is invalid'),
        );
      });

      it('throws BadRequestException', async () => {
        await expect(controller.signUp(signUpRequest)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('calls authService.signUp with the request', async () => {
        await controller.signUp(signUpRequest).catch(() => {
          /* noop */
        });
        expect(mockAuthService.signUp).toHaveBeenCalledWith(signUpRequest);
      });
    });

    describe('when required fields are missing', () => {
      const invalidRequest = {
        email: '',
        password: '',
      };

      beforeEach(() => {
        mockAuthService.signUp.mockRejectedValue(
          new BadRequestException('Email and password are required'),
        );
      });

      it('throws BadRequestException', async () => {
        await expect(controller.signUp(invalidRequest)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('calls authService.signUp with the request', async () => {
        await controller.signUp(invalidRequest).catch(() => {
          /* noop */
        });
        expect(mockAuthService.signUp).toHaveBeenCalledWith(invalidRequest);
      });
    });

    describe('when organization name already exists', () => {
      beforeEach(() => {
        mockAuthService.signUp.mockRejectedValue(
          new ConflictException('Organization name already exists'),
        );
      });

      it('throws ConflictException', async () => {
        await expect(controller.signUp(signUpRequest)).rejects.toThrow(
          ConflictException,
        );
      });

      it('calls authService.signUp with the request', async () => {
        await controller.signUp(signUpRequest).catch(() => {
          /* noop */
        });
        expect(mockAuthService.signUp).toHaveBeenCalledWith(signUpRequest);
      });
    });

    describe('when user creation fails after organization creation', () => {
      beforeEach(() => {
        mockAuthService.signUp.mockRejectedValue(
          new Error('Email testuser@packmind.com already exists'),
        );
      });

      it('throws error with email message', async () => {
        await expect(controller.signUp(signUpRequest)).rejects.toThrow(
          'Email testuser@packmind.com already exists',
        );
      });

      it('calls authService.signUp with the request', async () => {
        await controller.signUp(signUpRequest).catch(() => {
          /* noop */
        });
        expect(mockAuthService.signUp).toHaveBeenCalledWith(signUpRequest);
      });
    });
  });

  describe('signIn', () => {
    const signInRequest: SignInUserCommand = {
      email: 'testuser@packmind.com',
      password: 'password123',
    };

    describe('with valid credentials', () => {
      let result: Awaited<ReturnType<typeof controller.signIn>>;

      beforeEach(async () => {
        mockAuthService.signIn.mockResolvedValue(mockSignInResponse);
        mockConfiguration.getConfig.mockResolvedValue('false');
        result = await controller.signIn(signInRequest, mockResponse);
      });

      it('returns user and organization without access token', () => {
        expect(result).toEqual({
          user: mockSignInResponse.user,
          organization: mockSignInResponse.organization,
        });
      });

      it('calls authService.signIn with the request', () => {
        expect(mockAuthService.signIn).toHaveBeenCalledWith(signInRequest);
      });

      it('checks COOKIE_SECURE configuration', () => {
        expect(mockConfiguration.getConfig).toHaveBeenCalledWith(
          'COOKIE_SECURE',
        );
      });

      it('sets auth_token cookie with correct options', () => {
        expect(mockResponse.cookie).toHaveBeenCalledWith(
          'auth_token',
          'mock-jwt-token',
          {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: '/',
          },
        );
      });
    });

    describe('when credentials are invalid', () => {
      beforeEach(() => {
        mockAuthService.signIn.mockRejectedValue(
          new UnauthorizedException('Invalid credentials'),
        );
      });

      it('throws UnauthorizedException', async () => {
        await expect(
          controller.signIn(signInRequest, mockResponse),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('calls authService.signIn with the request', async () => {
        await controller.signIn(signInRequest, mockResponse).catch(() => {
          /* noop */
        });
        expect(mockAuthService.signIn).toHaveBeenCalledWith(signInRequest);
      });

      it('does not set cookie', async () => {
        await controller.signIn(signInRequest, mockResponse).catch(() => {
          /* noop */
        });
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });
    });

    describe('when user is not found', () => {
      beforeEach(() => {
        mockAuthService.signIn.mockRejectedValue(
          new UnauthorizedException('Invalid credentials'),
        );
      });

      it('throws UnauthorizedException', async () => {
        await expect(
          controller.signIn(signInRequest, mockResponse),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('calls authService.signIn with the request', async () => {
        await controller.signIn(signInRequest, mockResponse).catch(() => {
          /* noop */
        });
        expect(mockAuthService.signIn).toHaveBeenCalledWith(signInRequest);
      });

      it('does not set cookie', async () => {
        await controller.signIn(signInRequest, mockResponse).catch(() => {
          /* noop */
        });
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });
    });

    describe('when sign in fails', () => {
      beforeEach(() => {
        mockAuthService.signIn.mockRejectedValue(
          new UnauthorizedException('Sign in failed'),
        );
      });

      it('throws UnauthorizedException', async () => {
        await expect(
          controller.signIn(signInRequest, mockResponse),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('calls authService.signIn with the request', async () => {
        await controller.signIn(signInRequest, mockResponse).catch(() => {
          /* noop */
        });
        expect(mockAuthService.signIn).toHaveBeenCalledWith(signInRequest);
      });

      it('does not set cookie', async () => {
        await controller.signIn(signInRequest, mockResponse).catch(() => {
          /* noop */
        });
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });
    });
  });

  describe('signOut', () => {
    let result: Awaited<ReturnType<typeof controller.signOut>>;

    beforeEach(async () => {
      result = await controller.signOut(mockResponse);
    });

    it('returns success message', () => {
      expect(result).toEqual({ message: 'Sign out successful' });
    });

    it('sets empty auth_token cookie with correct options', () => {
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'auth_token',
        '',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          expires: expect.any(Date),
        }),
      );
    });

    it('sets cookie expiration in the past', () => {
      type CookieCall = [string, string, { expires?: Date }?];
      const cookieCall = mockResponse.cookie.mock.calls[0] as CookieCall;
      if (
        Array.isArray(cookieCall) &&
        cookieCall.length > 2 &&
        cookieCall[2] !== undefined
      ) {
        const options = cookieCall[2];
        if (options.expires) {
          expect(options.expires.getTime()).toBeLessThan(Date.now());
        }
      }
    });
  });

  describe('checkEmailAvailability', () => {
    const checkEmailRequest: CheckEmailAvailabilityCommand = {
      email: 'testuser@packmind.com',
    };

    describe('with unregistered email', () => {
      const mockCheckResponse: CheckEmailAvailabilityResponse = {
        available: true,
      };
      let result: CheckEmailAvailabilityResponse;

      beforeEach(async () => {
        mockAuthService.checkEmailAvailability.mockResolvedValue(
          mockCheckResponse,
        );
        result = await controller.checkEmailAvailability(checkEmailRequest);
      });

      it('returns available true', () => {
        expect(result).toEqual(mockCheckResponse);
      });

      it('calls authService.checkEmailAvailability with the request', () => {
        expect(mockAuthService.checkEmailAvailability).toHaveBeenCalledWith(
          checkEmailRequest,
        );
      });
    });

    describe('with already registered email', () => {
      const mockCheckResponse: CheckEmailAvailabilityResponse = {
        available: false,
      };
      let result: CheckEmailAvailabilityResponse;

      beforeEach(async () => {
        mockAuthService.checkEmailAvailability.mockResolvedValue(
          mockCheckResponse,
        );
        result = await controller.checkEmailAvailability(checkEmailRequest);
      });

      it('returns available false', () => {
        expect(result).toEqual(mockCheckResponse);
      });

      it('calls authService.checkEmailAvailability with the request', () => {
        expect(mockAuthService.checkEmailAvailability).toHaveBeenCalledWith(
          checkEmailRequest,
        );
      });
    });

    describe('when service throws error', () => {
      beforeEach(() => {
        mockAuthService.checkEmailAvailability.mockRejectedValue(
          new Error('Database connection failed'),
        );
      });

      it('propagates the error', async () => {
        await expect(
          controller.checkEmailAvailability(checkEmailRequest),
        ).rejects.toThrow('Database connection failed');
      });

      it('calls authService.checkEmailAvailability with the request', async () => {
        await controller.checkEmailAvailability(checkEmailRequest).catch(() => {
          /* noop */
        });
        expect(mockAuthService.checkEmailAvailability).toHaveBeenCalledWith(
          checkEmailRequest,
        );
      });
    });
  });

  describe('activateAccount', () => {
    describe('with valid token and auth token returned', () => {
      const token = 'valid-token-123';
      const password = 'newPassword123!';
      const mockResult = {
        success: true,
        user: {
          id: createUserId('1'),
          email: 'test@example.com',
          isActive: true,
        },
        authToken: 'jwt-auth-token',
      };
      const mockActivateResponse = {
        cookie: jest.fn(),
      } as unknown as Response;
      let result: Awaited<ReturnType<typeof controller.activateAccount>>;

      beforeEach(async () => {
        mockAuthService.activateAccount = jest
          .fn()
          .mockResolvedValue(mockResult);
        (Configuration.getConfig as jest.Mock).mockResolvedValue('true');
        result = await controller.activateAccount(
          token,
          { password },
          mockActivateResponse,
        );
      });

      it('returns success message with user', () => {
        expect(result).toEqual({
          message: 'Account activated successfully',
          user: mockResult.user,
        });
      });

      it('calls authService.activateAccount with token and password', () => {
        expect(mockAuthService.activateAccount).toHaveBeenCalledWith({
          token,
          password,
        });
      });

      it('sets auth_token cookie with correct options', () => {
        expect(mockActivateResponse.cookie).toHaveBeenCalledWith(
          'auth_token',
          'jwt-auth-token',
          {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: '/',
          },
        );
      });
    });

    describe('when no auth token is provided', () => {
      const token = 'valid-token-123';
      const password = 'newPassword123!';
      const mockResult = {
        success: true,
        user: {
          id: createUserId('1'),
          email: 'test@example.com',
          isActive: true,
        },
      };
      const mockActivateResponse = {
        cookie: jest.fn(),
      } as unknown as Response;
      let result: Awaited<ReturnType<typeof controller.activateAccount>>;

      beforeEach(async () => {
        mockAuthService.activateAccount = jest
          .fn()
          .mockResolvedValue(mockResult);
        result = await controller.activateAccount(
          token,
          { password },
          mockActivateResponse,
        );
      });

      it('returns success message with user', () => {
        expect(result).toEqual({
          message: 'Account activated successfully',
          user: mockResult.user,
        });
      });

      it('calls authService.activateAccount with token and password', () => {
        expect(mockAuthService.activateAccount).toHaveBeenCalledWith({
          token,
          password,
        });
      });

      it('does not set cookie', () => {
        expect(mockActivateResponse.cookie).not.toHaveBeenCalled();
      });
    });

    describe('when activation fails', () => {
      const token = 'invalid-token';
      const password = 'newPassword123!';
      const mockActivateResponse = {
        cookie: jest.fn(),
      } as unknown as Response;
      const error = new Error('Invitation not found');

      beforeEach(() => {
        mockAuthService.activateAccount = jest.fn().mockRejectedValue(error);
      });

      it('throws error', async () => {
        await expect(
          controller.activateAccount(token, { password }, mockActivateResponse),
        ).rejects.toThrow('Invitation not found');
      });

      it('calls authService.activateAccount with token and password', async () => {
        await controller
          .activateAccount(token, { password }, mockActivateResponse)
          .catch(() => {
            /* noop */
          });
        expect(mockAuthService.activateAccount).toHaveBeenCalledWith({
          token,
          password,
        });
      });

      it('does not set cookie', async () => {
        await controller
          .activateAccount(token, { password }, mockActivateResponse)
          .catch(() => {
            /* noop */
          });
        expect(mockActivateResponse.cookie).not.toHaveBeenCalled();
      });
    });
  });

  describe('getMe', () => {
    const mockRequest = {
      cookies: { auth_token: 'valid-token' },
    } as Request;

    const mockResponseWithStatus = {
      status: jest.fn().mockReturnThis(),
    } as unknown as Response;

    describe('with authenticated user having organization', () => {
      const mockGetMeResponse = {
        user: {
          id: createUserId('1'),
          email: 'test@example.com',
        },
        organization: {
          id: createOrganizationId('org-1'),
          name: 'Test Organization',
          slug: 'test-org',
          role: 'admin' as const,
        },
        authenticated: true,
      };
      let result: Awaited<ReturnType<typeof controller.getMe>>;

      beforeEach(async () => {
        mockAuthService.getMe.mockResolvedValue(mockGetMeResponse);
        result = await controller.getMe(mockRequest, mockResponseWithStatus);
      });

      it('returns the user and organization', () => {
        expect(result).toEqual(mockGetMeResponse);
      });

      it('calls authService.getMe with the token', () => {
        expect(mockAuthService.getMe).toHaveBeenCalledWith('valid-token');
      });

      it('does not set error status', () => {
        expect(mockResponseWithStatus.status).not.toHaveBeenCalled();
      });
    });

    describe('when user is not authenticated', () => {
      const mockGetMeResponse = {
        message: 'No valid access token found',
        authenticated: false,
      };
      let result: Awaited<ReturnType<typeof controller.getMe>>;

      beforeEach(async () => {
        mockAuthService.getMe.mockResolvedValue(mockGetMeResponse);
        result = await controller.getMe(mockRequest, mockResponseWithStatus);
      });

      it('returns unauthenticated response', () => {
        expect(result).toEqual(mockGetMeResponse);
      });

      it('calls authService.getMe with the token', () => {
        expect(mockAuthService.getMe).toHaveBeenCalledWith('valid-token');
      });

      it('sets 401 status', () => {
        expect(mockResponseWithStatus.status).toHaveBeenCalledWith(401);
      });
    });

    describe('with authenticated user having organizations list', () => {
      const mockGetMeResponse = {
        user: {
          id: createUserId('1'),
          email: 'test@example.com',
        },
        organizations: [
          {
            organization: {
              id: createOrganizationId('org-1'),
              name: 'Organization 1',
              slug: 'org-1',
            },
            role: 'admin' as const,
          },
        ],
        message: 'User is authenticated but has not selected an organization',
        authenticated: true,
      };
      let result: Awaited<ReturnType<typeof controller.getMe>>;

      beforeEach(async () => {
        mockAuthService.getMe.mockResolvedValue(mockGetMeResponse);
        result = await controller.getMe(mockRequest, mockResponseWithStatus);
      });

      it('returns the user and organizations list', () => {
        expect(result).toEqual(mockGetMeResponse);
      });

      it('calls authService.getMe with the token', () => {
        expect(mockAuthService.getMe).toHaveBeenCalledWith('valid-token');
      });

      it('does not set error status', () => {
        expect(mockResponseWithStatus.status).not.toHaveBeenCalled();
      });
    });

    describe('when service throws an error', () => {
      let result: Awaited<ReturnType<typeof controller.getMe>>;

      beforeEach(async () => {
        mockAuthService.getMe.mockRejectedValue(new Error('Service error'));
        result = await controller.getMe(mockRequest, mockResponseWithStatus);
      });

      it('returns error response', () => {
        expect(result).toEqual({
          message: 'Failed to get user info',
          authenticated: false,
          user: undefined,
          organization: undefined,
        });
      });

      it('sets 401 status', () => {
        expect(mockResponseWithStatus.status).toHaveBeenCalledWith(401);
      });
    });
  });

  describe('validateInvitation', () => {
    describe('with valid token', () => {
      const token = 'valid-token-123';
      const mockResult = {
        email: 'test@example.com',
        isValid: true,
      };
      let result: Awaited<ReturnType<typeof controller.validateInvitation>>;

      beforeEach(async () => {
        mockAuthService.validateInvitationToken = jest
          .fn()
          .mockResolvedValue(mockResult);
        result = await controller.validateInvitation(token);
      });

      it('returns valid result with email', () => {
        expect(result).toEqual(mockResult);
      });

      it('calls authService.validateInvitationToken with token', () => {
        expect(mockAuthService.validateInvitationToken).toHaveBeenCalledWith({
          token,
        });
      });
    });

    describe('when invitation token is invalid', () => {
      const token = 'invalid-token';
      const mockResult = {
        email: '',
        isValid: false,
      };
      let result: Awaited<ReturnType<typeof controller.validateInvitation>>;

      beforeEach(async () => {
        mockAuthService.validateInvitationToken = jest
          .fn()
          .mockResolvedValue(mockResult);
        result = await controller.validateInvitation(token);
      });

      it('returns invalid result', () => {
        expect(result).toEqual(mockResult);
      });

      it('calls authService.validateInvitationToken with token', () => {
        expect(mockAuthService.validateInvitationToken).toHaveBeenCalledWith({
          token,
        });
      });
    });

    describe('when invitation token is expired', () => {
      const token = 'expired-token';
      const mockResult = {
        email: '',
        isValid: false,
      };
      let result: Awaited<ReturnType<typeof controller.validateInvitation>>;

      beforeEach(async () => {
        mockAuthService.validateInvitationToken = jest
          .fn()
          .mockResolvedValue(mockResult);
        result = await controller.validateInvitation(token);
      });

      it('returns invalid result', () => {
        expect(result).toEqual(mockResult);
      });

      it('calls authService.validateInvitationToken with token', () => {
        expect(mockAuthService.validateInvitationToken).toHaveBeenCalledWith({
          token,
        });
      });
    });

    describe('when validation fails', () => {
      const token = 'malformed-token';
      const error = new Error('Token validation failed');

      beforeEach(() => {
        mockAuthService.validateInvitationToken = jest
          .fn()
          .mockRejectedValue(error);
      });

      it('throws the error', async () => {
        await expect(controller.validateInvitation(token)).rejects.toThrow(
          'Token validation failed',
        );
      });

      it('calls authService.validateInvitationToken with token', async () => {
        await controller.validateInvitation(token).catch(() => {
          /* noop */
        });
        expect(mockAuthService.validateInvitationToken).toHaveBeenCalledWith({
          token,
        });
      });
    });
  });
});
