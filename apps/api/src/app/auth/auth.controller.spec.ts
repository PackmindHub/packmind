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
    username: 'testuser',
    passwordHash: 'hashedPassword',
    organizationId: createOrganizationId('org-1'),
  };

  const mockSignInResponse = {
    user: {
      id: '1',
      username: 'testuser',
      organizationId: 'org-1',
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
      username: 'testuser',
      password: 'password123',
      organizationId: createOrganizationId('org-1'),
    };

    it('creates a new user successfully', async () => {
      mockAuthService.signUp.mockResolvedValue(mockUser);

      const result = await controller.signUp(signUpRequest);

      expect(result).toEqual(mockUser);
      expect(mockAuthService.signUp).toHaveBeenCalledWith(signUpRequest);
    });

    describe('when username already exists', () => {
      it('throws ConflictException', async () => {
        mockAuthService.signUp.mockRejectedValue(
          new ConflictException('Username already exists'),
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
          username: '',
          password: '',
          organizationId: createOrganizationId(''),
        };
        mockAuthService.signUp.mockRejectedValue(
          new BadRequestException(
            'Username, password, and organizationId are required',
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
      username: 'testuser',
      password: 'password123',
    };

    it('signs in user successfully and sets cookie', async () => {
      mockAuthService.signIn.mockResolvedValue(mockSignInResponse);
      mockConfiguration.getConfig.mockResolvedValue('false'); // Mock COOKIE_SECURE=false

      const result = await controller.signIn(signInRequest, mockResponse);

      expect(result).toEqual({
        message: 'Sign in successful',
        user: mockSignInResponse.user,
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
