import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  User,
  createOrganizationId,
  SignUpUserCommand,
  SignInUserCommand,
} from '@packmind/accounts';
import { createUserId } from '@packmind/accounts';
import {
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
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
    const signUpRequest: SignUpUserCommand = {
      email: 'testuser@packmind.com',
      password: 'password123',
      organizationId: createOrganizationId('org-1'),
    };

    it('creates a new user successfully', async () => {
      mockAuthService.signUp.mockResolvedValue(mockUser);

      const result = await controller.signUp(signUpRequest);

      expect(result).toEqual(mockUser);
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

    describe('when organization is not found', () => {
      it('throws BadRequestException', async () => {
        mockAuthService.signUp.mockRejectedValue(
          new BadRequestException('Organization not found'),
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
          organizationId: createOrganizationId(''),
        };
        mockAuthService.signUp.mockRejectedValue(
          new BadRequestException(
            'Email, password, and organizationId are required',
          ),
        );

        await expect(controller.signUp(invalidRequest)).rejects.toThrow(
          BadRequestException,
        );
        expect(mockAuthService.signUp).toHaveBeenCalledWith(invalidRequest);
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
        message: 'Sign in successful',
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
});
