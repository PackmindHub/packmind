import {
  Controller,
  Post,
  Get,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  AuthService,
  GetMeResponse,
  GenerateApiKeyResponse,
  GetCurrentApiKeyResponse,
  SignInUserResponse,
} from './auth.service';
import { User, SignUpUserCommand, SignInUserCommand } from '@packmind/accounts';
import { Public } from './auth.guard';
import { AuthenticatedRequest } from '@packmind/shared-nest';
import { Configuration } from '@packmind/shared';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {
    this.logger.log('AuthController initialized');
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() signUpRequest: SignUpUserCommand): Promise<User> {
    this.logger.log(`POST /auth/signup - Signing up user`, {
      email: signUpRequest.email,
    });

    try {
      const user = await this.authService.signUp(signUpRequest);

      this.logger.log(`POST /auth/signup - User signed up successfully`, {
        userId: user.id,
        email: user.email,
      });

      return user;
    } catch (error) {
      this.logger.error(`POST /auth/signup - Failed to sign up user`, {
        email: signUpRequest.email,
        error: error.message,
      });
      throw error;
    }
  }

  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() signInRequest: SignInUserCommand,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{
    message: string;
    user: SignInUserResponse['user'];
    organization: SignInUserResponse['organization'];
  }> {
    this.logger.log(`POST /auth/signin - Signing in user`, {
      email: signInRequest.email,
    });

    try {
      const result = await this.authService.signIn(signInRequest);

      // Get cookie security setting from Configuration
      const cookieSecure = await Configuration.getConfig('COOKIE_SECURE');
      const isSecure = cookieSecure === 'true';

      this.logger.log('Cookie configuration', {
        cookieSecure,
        isSecure,
        source: 'Configuration.getConfig',
      });

      // Set JWT token as httpOnly cookie
      response.cookie('auth_token', result.accessToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        path: '/',
      });

      this.logger.log(`POST /auth/signin - User signed in successfully`, {
        userId: result.user.id,
        email: result.user.email,
      });

      return {
        message: 'Sign in successful',
        user: result.user,
        organization: result.organization,
      };
    } catch (error) {
      this.logger.error(`POST /auth/signin - Failed to sign in user`, {
        email: signInRequest.email,
        error: error.message,
      });
      throw error;
    }
  }

  @Post('signout')
  @HttpCode(HttpStatus.OK)
  async signOut(
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    this.logger.log('POST /auth/signout - Signing out user');
    response.cookie('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0), // Expire the cookie immediately
    });
    return { message: 'Sign out successful' };
  }

  @Public()
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@Req() request: Request): Promise<GetMeResponse> {
    this.logger.log(
      'GET /auth/me - Getting current user and organization info',
    );

    try {
      const accessToken = request.cookies?.auth_token;
      const result = await this.authService.getMe(accessToken);

      if (result.authenticated) {
        this.logger.log('GET /auth/me - User info retrieved successfully', {
          userId: result.user?.id,
          email: result.user?.email,
          organizationName: result.organization?.name,
        });
      } else {
        this.logger.log('GET /auth/me - User not authenticated', {
          message: result.message,
        });
      }

      return result;
    } catch (error) {
      this.logger.error('GET /auth/me - Failed to get user info', {
        error: error.message,
      });
      return {
        message: 'Failed to get user info',
        authenticated: false,
        user: undefined,
        organization: undefined,
      };
    }
  }

  @Post('api-key/generate')
  @HttpCode(HttpStatus.CREATED)
  async generateApiKey(
    @Req() request: AuthenticatedRequest,
    @Body() body: { host?: string } = {},
  ): Promise<GenerateApiKeyResponse> {
    this.logger.log('POST /auth/api-key/generate - Generating API key', {
      userId: request.user.userId,
      organizationId: request.organization.id,
    });

    try {
      // Use provided host or default to request host
      const host = body.host || `${request.protocol}://${request.get('host')}`;

      const result = await this.authService.generateApiKey(request, host);

      this.logger.log(
        'POST /auth/api-key/generate - API key generated successfully',
        {
          userId: request.user.userId,
          expiresAt: result.expiresAt,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(
        'POST /auth/api-key/generate - Failed to generate API key',
        {
          userId: request.user.userId,
          error: error.message,
        },
      );
      throw error;
    }
  }

  @Get('api-key/current')
  @HttpCode(HttpStatus.OK)
  async getCurrentApiKey(
    @Req() request: AuthenticatedRequest,
  ): Promise<GetCurrentApiKeyResponse> {
    this.logger.log(
      'GET /auth/api-key/current - Getting current API key info',
      {
        userId: request.user.userId,
        organizationId: request.organization.id,
      },
    );

    try {
      const result = await this.authService.getCurrentApiKey(request);

      this.logger.log('GET /auth/api-key/current - API key info retrieved', {
        userId: request.user.userId,
        hasApiKey: result.hasApiKey,
      });

      return result;
    } catch (error) {
      this.logger.error(
        'GET /auth/api-key/current - Failed to get API key info',
        {
          userId: request.user.userId,
          error: error.message,
        },
      );
      throw error;
    }
  }
}
