import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  User,
  createOrganizationId,
  SignInUserCommand,
  Organization,
} from '@packmind/accounts';
import {
  CheckEmailAvailabilityCommand,
  CheckEmailAvailabilityResponse,
  SignUpWithOrganizationCommand,
} from '@packmind/types';
import { createUserId } from '@packmind/accounts';
import {
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Configuration } from '@packmind/shared';

// Mock only Configuration, preserve other exports
jest.mock('@packmind/shared', () => ({
  ...jest.requireActual('@packmind/shared'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

describe('AuthController', () => {
  let controller: AuthController;

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
      organizationName: 'Test Organization',
    };

    it('creates a new user with organization successfully', async () => {
      const mockResponse = {
        user: mockUser,
        organization: mockOrganization,
      };
      mockAuthService.signUp.mockResolvedValue(mockResponse);

      const result = await controller.signUp(signUpRequest);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.signUp).toHaveBeenCalledWith(signUpRequest);
    });

    describe('when email already exists', () => {
      it('throws ConflictException', async () => {
        mockAuthService.signUp.mockRejectedValue(
          new ConflictException('Email already exists'),
        );

        await expect(controller.signUp(signUpRequest)).rejects.toThrow(
          ConflictException,
        );
        expect(mockAuthService.signUp).toHaveBeenCalledWith(signUpRequest);
      });
    });

    describe('when organization name is invalid', () => {
      it('throws BadRequestException', async () => {
        mockAuthService.signUp.mockRejectedValue(
          new BadRequestException('Organization name is invalid'),
        );

        await expect(controller.signUp(signUpRequest)).rejects.toThrow(
          BadRequestException,
        );
        expect(mockAuthService.signUp).toHaveBeenCalledWith(signUpRequest);
      });
    });

    describe('when required fields are missing', () => {
      it('throws BadRequestException', async () => {
        const invalidRequest = {
          email: '',
          password: '',
          organizationName: '',
        };
        mockAuthService.signUp.mockRejectedValue(
          new BadRequestException(
            'Email, password, and organizationName are required',
          ),
        );

        await expect(controller.signUp(invalidRequest)).rejects.toThrow(
          BadRequestException,
        );
        expect(mockAuthService.signUp).toHaveBeenCalledWith(invalidRequest);
      });
    });

    describe('when organization name already exists', () => {
      it('throws ConflictException', async () => {
        mockAuthService.signUp.mockRejectedValue(
          new ConflictException('Organization name already exists'),
        );

        await expect(controller.signUp(signUpRequest)).rejects.toThrow(
          ConflictException,
        );
        expect(mockAuthService.signUp).toHaveBeenCalledWith(signUpRequest);
      });
    });

    describe('when user creation fails after organization creation', () => {
      it('throws error but organization remains created', async () => {
        mockAuthService.signUp.mockRejectedValue(
          new Error('Email testuser@packmind.com already exists'),
        );

        await expect(controller.signUp(signUpRequest)).rejects.toThrow(
          'Email testuser@packmind.com already exists',
        );
        expect(mockAuthService.signUp).toHaveBeenCalledWith(signUpRequest);
      });
    });
  });

  describe('signIn', () => {
    const signInRequest: SignInUserCommand = {
      email: 'testuser@packmind.com',
      password: 'password123',
    };

    it('signs in user successfully and sets cookie', async () => {
      mockAuthService.signIn.mockResolvedValue(mockSignInResponse);
      mockConfiguration.getConfig.mockResolvedValue('false'); // Mock COOKIE_SECURE=false

      const result = await controller.signIn(signInRequest, mockResponse);

      expect(result).toEqual({
        user: mockSignInResponse.user,
        organization: mockSignInResponse.organization,
      });
      expect(mockAuthService.signIn).toHaveBeenCalledWith(signInRequest);
      expect(mockConfiguration.getConfig).toHaveBeenCalledWith('COOKIE_SECURE');
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'auth_token',
        'mock-jwt-token',
        {
          httpOnly: true,
          secure: false, // Should be false when COOKIE_SECURE is not 'true'
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000,
          path: '/',
        },
      );
    });

    describe('when credentials are invalid', () => {
      it('throws UnauthorizedException', async () => {
        mockAuthService.signIn.mockRejectedValue(
          new UnauthorizedException('Invalid credentials'),
        );

        await expect(
          controller.signIn(signInRequest, mockResponse),
        ).rejects.toThrow(UnauthorizedException);
        expect(mockAuthService.signIn).toHaveBeenCalledWith(signInRequest);
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });
    });

    describe('when user is not found', () => {
      it('throws UnauthorizedException', async () => {
        mockAuthService.signIn.mockRejectedValue(
          new UnauthorizedException('Invalid credentials'),
        );

        await expect(
          controller.signIn(signInRequest, mockResponse),
        ).rejects.toThrow(UnauthorizedException);
        expect(mockAuthService.signIn).toHaveBeenCalledWith(signInRequest);
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });
    });

    describe('when sign in fails', () => {
      it('throws UnauthorizedException', async () => {
        mockAuthService.signIn.mockRejectedValue(
          new UnauthorizedException('Sign in failed'),
        );

        await expect(
          controller.signIn(signInRequest, mockResponse),
        ).rejects.toThrow(UnauthorizedException);
        expect(mockAuthService.signIn).toHaveBeenCalledWith(signInRequest);
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });
    });
  });

  describe('signOut', () => {
    it('clears the auth_token cookie and returns a success message', async () => {
      const result = await controller.signOut(mockResponse);
      expect(result).toEqual({ message: 'Sign out successful' });
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'auth_token',
        '',
        expect.objectContaining({
          httpOnly: true,
          secure: false, // Should be false in development
          sameSite: 'strict',
          expires: expect.any(Date),
        }),
      );
      // The expires date should be in the past
      type CookieCall = [string, string, { expires?: Date }?];
      const cookieCall = mockResponse.cookie.mock.calls[0] as CookieCall;
      if (
        Array.isArray(cookieCall) &&
        cookieCall.length > 2 &&
        cookieCall[2] !== undefined
      ) {
        const options = cookieCall[2];
        if (options.expires) {
          expect(options.expires).toBeInstanceOf(Date);
          expect(options.expires.getTime()).toBeLessThan(Date.now());
        }
      }
    });
  });

  describe('checkEmailAvailability', () => {
    const checkEmailRequest: CheckEmailAvailabilityCommand = {
      email: 'testuser@packmind.com',
    };

    it('returns available true for unregistered email', async () => {
      const mockResponse: CheckEmailAvailabilityResponse = {
        available: true,
      };
      mockAuthService.checkEmailAvailability.mockResolvedValue(mockResponse);

      const result = await controller.checkEmailAvailability(checkEmailRequest);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.checkEmailAvailability).toHaveBeenCalledWith(
        checkEmailRequest,
      );
    });

    it('returns available false for already registered email', async () => {
      const mockResponse: CheckEmailAvailabilityResponse = {
        available: false,
      };
      mockAuthService.checkEmailAvailability.mockResolvedValue(mockResponse);

      const result = await controller.checkEmailAvailability(checkEmailRequest);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.checkEmailAvailability).toHaveBeenCalledWith(
        checkEmailRequest,
      );
    });

    describe('when service throws error', () => {
      it('propagates the error', async () => {
        mockAuthService.checkEmailAvailability.mockRejectedValue(
          new Error('Database connection failed'),
        );

        await expect(
          controller.checkEmailAvailability(checkEmailRequest),
        ).rejects.toThrow('Database connection failed');
        expect(mockAuthService.checkEmailAvailability).toHaveBeenCalledWith(
          checkEmailRequest,
        );
      });
    });
  });

  describe('activateAccount', () => {
    it('activates account successfully and sets auth cookie', async () => {
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

      const mockResponse = {
        cookie: jest.fn(),
      } as unknown as Response;

      mockAuthService.activateAccount = jest.fn().mockResolvedValue(mockResult);
      (Configuration.getConfig as jest.Mock).mockResolvedValue('true');

      const result = await controller.activateAccount(
        token,
        { password },
        mockResponse,
      );

      expect(result).toEqual({
        message: 'Account activated successfully',
        user: mockResult.user,
      });

      expect(mockAuthService.activateAccount).toHaveBeenCalledWith({
        token,
        password,
      });

      expect(mockResponse.cookie).toHaveBeenCalledWith(
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

    describe('when no auth token is provided', () => {
      it('activates account without setting cookie', async () => {
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

        const mockResponse = {
          cookie: jest.fn(),
        } as unknown as Response;

        mockAuthService.activateAccount = jest
          .fn()
          .mockResolvedValue(mockResult);

        const result = await controller.activateAccount(
          token,
          { password },
          mockResponse,
        );

        expect(result).toEqual({
          message: 'Account activated successfully',
          user: mockResult.user,
        });

        expect(mockAuthService.activateAccount).toHaveBeenCalledWith({
          token,
          password,
        });

        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });
    });

    it('handles activation errors', async () => {
      const token = 'invalid-token';
      const password = 'newPassword123!';
      const mockResponse = {
        cookie: jest.fn(),
      } as unknown as Response;

      const error = new Error('Invitation not found');
      mockAuthService.activateAccount = jest.fn().mockRejectedValue(error);

      await expect(
        controller.activateAccount(token, { password }, mockResponse),
      ).rejects.toThrow('Invitation not found');

      expect(mockAuthService.activateAccount).toHaveBeenCalledWith({
        token,
        password,
      });

      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    const mockRequest = {
      cookies: { auth_token: 'valid-token' },
    } as Request;

    const mockResponseWithStatus = {
      status: jest.fn().mockReturnThis(),
    } as unknown as Response;

    it('returns authenticated user with organization', async () => {
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

      mockAuthService.getMe.mockResolvedValue(mockGetMeResponse);

      const result = await controller.getMe(
        mockRequest,
        mockResponseWithStatus,
      );

      expect(result).toEqual(mockGetMeResponse);
      expect(mockAuthService.getMe).toHaveBeenCalledWith('valid-token');
      expect(mockResponseWithStatus.status).not.toHaveBeenCalled();
    });

    describe('user is not authenticated', () => {
      it('returns 401', async () => {
        const mockGetMeResponse = {
          message: 'No valid access token found',
          authenticated: false,
        };

        mockAuthService.getMe.mockResolvedValue(mockGetMeResponse);

        const result = await controller.getMe(
          mockRequest,
          mockResponseWithStatus,
        );

        expect(result).toEqual(mockGetMeResponse);
        expect(mockAuthService.getMe).toHaveBeenCalledWith('valid-token');
        expect(mockResponseWithStatus.status).toHaveBeenCalledWith(401);
      });
    });

    it('returns authenticated user with organizations list', async () => {
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

      mockAuthService.getMe.mockResolvedValue(mockGetMeResponse);

      const result = await controller.getMe(
        mockRequest,
        mockResponseWithStatus,
      );

      expect(result).toEqual(mockGetMeResponse);
      expect(mockAuthService.getMe).toHaveBeenCalledWith('valid-token');
      expect(mockResponseWithStatus.status).not.toHaveBeenCalled();
    });

    describe('service throws an error', () => {
      it('returns 401', async () => {
        mockAuthService.getMe.mockRejectedValue(new Error('Service error'));

        const result = await controller.getMe(
          mockRequest,
          mockResponseWithStatus,
        );

        expect(result).toEqual({
          message: 'Failed to get user info',
          authenticated: false,
          user: undefined,
          organization: undefined,
        });
        expect(mockResponseWithStatus.status).toHaveBeenCalledWith(401);
      });
    });
  });

  describe('validateInvitation', () => {
    it('validates invitation token successfully', async () => {
      const token = 'valid-token-123';
      const mockResult = {
        email: 'test@example.com',
        isValid: true,
      };

      mockAuthService.validateInvitationToken = jest
        .fn()
        .mockResolvedValue(mockResult);

      const result = await controller.validateInvitation(token);

      expect(result).toEqual(mockResult);
      expect(mockAuthService.validateInvitationToken).toHaveBeenCalledWith({
        token,
      });
    });

    describe('when invitation token is invalid', () => {
      it('returns invalid result', async () => {
        const token = 'invalid-token';
        const mockResult = {
          email: '',
          isValid: false,
        };

        mockAuthService.validateInvitationToken = jest
          .fn()
          .mockResolvedValue(mockResult);

        const result = await controller.validateInvitation(token);

        expect(result).toEqual(mockResult);
        expect(mockAuthService.validateInvitationToken).toHaveBeenCalledWith({
          token,
        });
      });
    });

    describe('when invitation token is expired', () => {
      it('returns invalid result', async () => {
        const token = 'expired-token';
        const mockResult = {
          email: '',
          isValid: false,
        };

        mockAuthService.validateInvitationToken = jest
          .fn()
          .mockResolvedValue(mockResult);

        const result = await controller.validateInvitation(token);

        expect(result).toEqual(mockResult);
        expect(mockAuthService.validateInvitationToken).toHaveBeenCalledWith({
          token,
        });
      });
    });

    describe('when validation fails', () => {
      it('throws the error', async () => {
        const token = 'malformed-token';
        const error = new Error('Token validation failed');

        mockAuthService.validateInvitationToken = jest
          .fn()
          .mockRejectedValue(error);

        await expect(controller.validateInvitation(token)).rejects.toThrow(
          'Token validation failed',
        );

        expect(mockAuthService.validateInvitationToken).toHaveBeenCalledWith({
          token,
        });
      });
    });
  });
});
