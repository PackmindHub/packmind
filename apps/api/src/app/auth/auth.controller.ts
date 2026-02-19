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
  Param,
  Query,
  HttpException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  AuthService,
  GetMeResponse,
  GenerateApiKeyResponse,
  GetCurrentApiKeyResponse,
  SelectOrganizationCommand,
} from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { WorkOsService } from './workos.service';
import { SocialProvider } from '@packmind/types';
import { maskEmail } from '@packmind/logger';
import { getErrorMessage } from '../shared/utils/error.utils';
import {
  SignInUserCommand,
  SignInUserResponse,
  SignUpWithOrganizationCommand,
  SignUpWithOrganizationResponse,
  CheckEmailAvailabilityCommand,
  CheckEmailAvailabilityResponse,
  RequestPasswordResetCommand,
  RequestPasswordResetResponse,
  TooManyLoginAttemptsError,
  InvalidEmailOrPasswordError,
  CreateCliLoginCodeResponse,
  ExchangeCliLoginCodeCommand,
  ExchangeCliLoginCodeResponse,
  CliLoginCodeExpiredError,
  CliLoginCodeNotFoundError,
  InvalidTrialActivationTokenError,
  EmailAlreadyExistsError,
} from '@packmind/accounts';
import {
  ActivateTrialAccountResult,
  GetUserOnboardingStatusResponse,
  CompleteUserOnboardingResponse,
} from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { Configuration } from '@packmind/node-utils';
import { Public } from '@packmind/node-utils';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly workOsService: WorkOsService,
    private readonly jwtService: JwtService,
  ) {
    this.logger.log('AuthController initialized');
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signUp(
    @Body() signUpRequest: SignUpWithOrganizationCommand,
  ): Promise<SignUpWithOrganizationResponse> {
    this.logger.log(`POST /auth/signup - Signing up user`, {
      email: maskEmail(signUpRequest.email),
    });

    try {
      const result = await this.authService.signUp(signUpRequest);

      this.logger.log(
        `POST /auth/signup - User signed up with organization successfully`,
        {
          userId: result.user.id,
          email: maskEmail(result.user.email),
          organizationId: result.organization.id,
          organizationName: result.organization.name,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(`POST /auth/signup - Failed to sign up user`, {
        email: maskEmail(signUpRequest.email),
        error: getErrorMessage(error),
      });

      if (error instanceof EmailAlreadyExistsError) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }

      throw error;
    }
  }

  @Public()
  @Post('check-email-availability')
  @HttpCode(HttpStatus.OK)
  async checkEmailAvailability(
    @Body() request: CheckEmailAvailabilityCommand,
  ): Promise<CheckEmailAvailabilityResponse> {
    this.logger.log(
      `POST /auth/check-email-availability - Checking email availability`,
      {
        email: maskEmail(request.email),
      },
    );

    try {
      const result = await this.authService.checkEmailAvailability(request);

      this.logger.log(
        `POST /auth/check-email-availability - Email availability checked successfully`,
        {
          email: maskEmail(request.email),
          available: result.available,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(
        `POST /auth/check-email-availability - Failed to check email availability`,
        {
          email: maskEmail(request.email),
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() signInRequest: SignInUserCommand,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignInUserResponse> {
    this.logger.log(`POST /auth/signin - Signing in user`, {
      email: maskEmail(signInRequest.email),
    });

    try {
      const { accessToken, ...result } =
        await this.authService.signIn(signInRequest);

      // Get cookie security setting from Configuration
      const cookieSecure = await Configuration.getConfig('COOKIE_SECURE');
      const isSecure = cookieSecure === 'true';

      this.logger.log('Cookie configuration', {
        cookieSecure,
        isSecure,
        source: 'Configuration.getConfig',
      });

      // Set JWT token as httpOnly cookie
      response.cookie('auth_token', accessToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        path: '/',
      });

      // Set onboarding completion status cookie if user has an organization
      if (result.organization) {
        try {
          const onboardingStatus = await this.authService.getOnboardingStatus(
            result.user.id,
            result.organization.id,
          );
          response.cookie(
            'onboarding_completed',
            String(onboardingStatus.hasDeployed),
            {
              httpOnly: true,
              secure: isSecure,
              sameSite: 'strict',
              maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
              path: '/',
            },
          );
        } catch (error) {
          this.logger.warn('Failed to fetch onboarding status during sign-in', {
            userId: result.user.id,
            error: getErrorMessage(error),
          });
        }
      }

      this.logger.log(`POST /auth/signin - User signed in successfully`, {
        userId: result.user.id,
        email: maskEmail(result.user.email),
      });

      return result;
    } catch (error) {
      this.logger.error(`POST /auth/signin - Failed to sign in user`, {
        email: maskEmail(signInRequest.email),
        error: getErrorMessage(error),
      });

      // Handle rate limiting errors with 429 status
      if (error instanceof TooManyLoginAttemptsError) {
        throw new HttpException(
          {
            message: getErrorMessage(error),
            bannedUntil: error.bannedUntil.toISOString(),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Convert domain error to HTTP exception (prevents stack trace logging)
      if (error instanceof InvalidEmailOrPasswordError) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }

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
    response.cookie('onboarding_completed', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0), // Expire the cookie immediately
    });
    return { message: 'Sign out successful' };
  }

  @Public()
  @Post('selectOrganization')
  @HttpCode(HttpStatus.OK)
  async selectOrganization(
    @Body() request: SelectOrganizationCommand,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.logger.log('POST /auth/selectOrganization - Selecting organization', {
      organizationId: request.organizationId,
    });

    try {
      const accessToken = req.cookies?.auth_token;

      if (!accessToken) {
        throw new Error('No valid access token found');
      }

      const result = await this.authService.selectOrganization(
        accessToken,
        request,
      );

      // Get cookie security setting from Configuration
      const cookieSecure = await Configuration.getConfig('COOKIE_SECURE');
      const isSecure = cookieSecure === 'true';

      // Update the JWT token cookie with the new token that includes the organization
      response.cookie('auth_token', result.accessToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        path: '/',
      });

      // Update onboarding completion status cookie for the new organization
      try {
        const payload = this.authService.verifyToken(accessToken);
        const onboardingStatus = await this.authService.getOnboardingStatus(
          payload.user.userId,
          request.organizationId,
        );
        response.cookie(
          'onboarding_completed',
          String(onboardingStatus.hasDeployed),
          {
            httpOnly: true,
            secure: isSecure,
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/',
          },
        );
      } catch (error) {
        this.logger.warn(
          'Failed to fetch onboarding status during organization selection',
          {
            organizationId: request.organizationId,
            error: getErrorMessage(error),
          },
        );
      }

      this.logger.log(
        'POST /auth/selectOrganization - Organization selected successfully',
        {
          organizationId: request.organizationId,
        },
      );

      return {};
    } catch (error) {
      this.logger.error(
        'POST /auth/selectOrganization - Failed to select organization',
        {
          organizationId: request.organizationId,
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  @Public()
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GetMeResponse> {
    this.logger.log(
      'GET /auth/me - Getting current user and organization info',
    );

    try {
      const accessToken = request.cookies?.auth_token;
      const result = await this.authService.getMe(accessToken);

      if (result.authenticated) {
        this.logger.log('GET /auth/me - User info retrieved successfully', {
          userId: result.user?.id,
          email: result.user?.email ? maskEmail(result.user.email) : undefined,
          organizationName: result.organization?.name,
        });
      } else {
        this.logger.log('GET /auth/me - User not authenticated', {
          message: result.message,
        });
        response.status(HttpStatus.UNAUTHORIZED);
      }

      return result;
    } catch (error) {
      this.logger.error('GET /auth/me - Failed to get user info', {
        error: getErrorMessage(error),
      });
      response.status(HttpStatus.UNAUTHORIZED);
      return {
        message: 'Failed to get user info',
        authenticated: false,
      } as GetMeResponse;
    }
  }

  @Post('api-key/generate')
  @HttpCode(HttpStatus.CREATED)
  async generateApiKey(
    @Req() request: AuthenticatedRequest,
  ): Promise<GenerateApiKeyResponse> {
    this.logger.log('POST /auth/api-key/generate - Generating API key', {
      userId: request.user.userId,
      organizationId: request.organization.id,
    });

    try {
      const result = await this.authService.generateApiKey(request);

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
          error: getErrorMessage(error),
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
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  @Public()
  @Get('validate-invitation/:token')
  @HttpCode(HttpStatus.OK)
  async validateInvitation(
    @Param('token') token: string,
  ): Promise<{ email: string; isValid: boolean }> {
    this.logger.log(
      'GET /auth/validate-invitation/:token - Validating invitation token',
      {
        token: this.maskToken(token),
      },
    );

    try {
      const result = await this.authService.validateInvitationToken({ token });

      this.logger.log(
        'GET /auth/validate-invitation/:token - Invitation token validated',
        {
          token: this.maskToken(token),
          isValid: result.isValid,
          hasEmail: !!result.email,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(
        'GET /auth/validate-invitation/:token - Failed to validate invitation token',
        {
          token: this.maskToken(token),
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  @Public()
  @Post('activate/:token')
  @HttpCode(HttpStatus.OK)
  async activateAccount(
    @Param('token') token: string,
    @Body() body: { password: string },
    @Res({ passthrough: true }) response: Response,
  ): Promise<{
    message: string;
    user: {
      id: string;
      email: string;
      isActive: boolean;
    };
  }> {
    this.logger.log('POST /auth/activate/:token - Activating user account', {
      token: this.maskToken(token),
    });

    try {
      const result = await this.authService.activateAccount({
        token,
        password: body.password,
      });

      if (result.success && result.authToken) {
        // Get cookie security setting from Configuration
        const cookieSecure = await Configuration.getConfig('COOKIE_SECURE');
        const isSecure = cookieSecure === 'true';

        // Set JWT token as httpOnly cookie for auto-login
        response.cookie('auth_token', result.authToken, {
          httpOnly: true,
          secure: isSecure,
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
          path: '/',
        });

        // Set onboarding completion status cookie (always false for new accounts)
        response.cookie('onboarding_completed', 'false', {
          httpOnly: true,
          secure: isSecure,
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          path: '/',
        });
      }

      this.logger.log(
        'POST /auth/activate/:token - Account activated successfully',
        {
          userId: result.user.id,
          email: maskEmail(result.user.email),
        },
      );

      return {
        message: 'Account activated successfully',
        user: result.user,
      };
    } catch (error) {
      this.logger.error(
        'POST /auth/activate/:token - Failed to activate account',
        {
          token: this.maskToken(token),
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(
    @Body() request: RequestPasswordResetCommand,
  ): Promise<RequestPasswordResetResponse> {
    this.logger.log('POST /auth/forgot-password - Requesting password reset', {
      email: maskEmail(request.email),
    });

    try {
      const result = await this.authService.requestPasswordReset(request);

      this.logger.log(
        'POST /auth/forgot-password - Password reset request completed',
        {
          email: maskEmail(request.email),
          success: result.success,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(
        'POST /auth/forgot-password - Failed to request password reset',
        {
          email: maskEmail(request.email),
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  @Public()
  @Get('validate-password-reset/:token')
  @HttpCode(HttpStatus.OK)
  async validatePasswordResetToken(
    @Param('token') token: string,
  ): Promise<{ email: string; isValid: boolean }> {
    this.logger.log(
      'GET /auth/validate-password-reset/:token - Validating password reset token',
      {
        token: this.maskToken(token),
      },
    );

    try {
      const result = await this.authService.validatePasswordResetToken({
        token,
      });

      this.logger.log(
        'GET /auth/validate-password-reset/:token - Password reset token validated',
        {
          token: this.maskToken(token),
          isValid: result.isValid,
          hasEmail: !!result.email,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(
        'GET /auth/validate-password-reset/:token - Failed to validate password reset token',
        {
          token: this.maskToken(token),
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: { token: string; password: string },
    @Res({ passthrough: true }) response: Response,
  ): Promise<{
    message: string;
    user: {
      id: string;
      email: string;
      isActive: boolean;
    };
  }> {
    this.logger.log('POST /auth/reset-password - Resetting password', {
      token: this.maskToken(body.token),
    });

    try {
      const result = await this.authService.resetPassword({
        token: body.token,
        password: body.password,
      });

      if (result.success && result.authToken) {
        // Get cookie security setting from Configuration
        const cookieSecure = await Configuration.getConfig('COOKIE_SECURE');
        const isSecure = cookieSecure === 'true';

        // Set JWT token as httpOnly cookie for auto-login
        response.cookie('auth_token', result.authToken, {
          httpOnly: true,
          secure: isSecure,
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
          path: '/',
        });
      }

      this.logger.log(
        'POST /auth/reset-password - Password reset successfully',
        {
          userId: result.user.id,
          email: maskEmail(result.user.email),
        },
      );

      return {
        message: 'Password reset successfully',
        user: result.user,
      };
    } catch (error) {
      this.logger.error(
        'POST /auth/reset-password - Failed to reset password',
        {
          token: this.maskToken(body.token),
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  @Public()
  @Post('activate-trial-account')
  @HttpCode(HttpStatus.OK)
  async activateTrialAccount(
    @Body()
    body: {
      activationToken: string;
      email: string;
      password: string;
      organizationName: string;
    },
    @Res({ passthrough: true }) response: Response,
  ): Promise<ActivateTrialAccountResult> {
    this.logger.log(
      'POST /auth/activate-trial-account - Activating trial account',
      {
        token: this.maskToken(body.activationToken),
        email: maskEmail(body.email),
      },
    );

    try {
      const result = await this.authService.activateTrialAccount(body);

      if (result.authToken) {
        // Get cookie security setting from Configuration
        const cookieSecure = await Configuration.getConfig('COOKIE_SECURE');
        const isSecure = cookieSecure === 'true';

        // Set JWT token as httpOnly cookie for auto-login
        response.cookie('auth_token', result.authToken, {
          httpOnly: true,
          secure: isSecure,
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
          path: '/',
        });
      }

      this.logger.log(
        'POST /auth/activate-trial-account - Trial account activated successfully',
        {
          userId: String(result.user.id),
          email: maskEmail(result.user.email),
          organizationId: String(result.organization.id),
        },
      );

      return {
        user: result.user,
        organization: result.organization,
      };
    } catch (error) {
      this.logger.error(
        'POST /auth/activate-trial-account - Failed to activate trial account',
        {
          token: this.maskToken(body.activationToken),
          email: maskEmail(body.email),
          error: getErrorMessage(error),
        },
      );

      if (error instanceof InvalidTrialActivationTokenError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }

      throw error;
    }
  }

  @Post('cli-login-code')
  @HttpCode(HttpStatus.CREATED)
  async createCliLoginCode(
    @Req() request: AuthenticatedRequest,
  ): Promise<CreateCliLoginCodeResponse> {
    this.logger.log('POST /auth/cli-login-code - Creating CLI login code', {
      userId: request.user.userId,
      organizationId: request.organization.id,
    });

    try {
      const result = await this.authService.createCliLoginCode(request);

      this.logger.log(
        'POST /auth/cli-login-code - CLI login code created successfully',
        {
          userId: request.user.userId,
          expiresAt: result.expiresAt.toISOString(),
        },
      );

      return result;
    } catch (error) {
      this.logger.error(
        'POST /auth/cli-login-code - Failed to create CLI login code',
        {
          userId: request.user.userId,
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  @Public()
  @Post('cli-login-exchange')
  @HttpCode(HttpStatus.OK)
  async exchangeCliLoginCode(
    @Body() body: ExchangeCliLoginCodeCommand,
  ): Promise<ExchangeCliLoginCodeResponse> {
    this.logger.log(
      'POST /auth/cli-login-exchange - Exchanging CLI login code',
    );

    try {
      const result = await this.authService.exchangeCliLoginCode(body);

      this.logger.log(
        'POST /auth/cli-login-exchange - CLI login code exchanged successfully',
      );

      return result;
    } catch (error) {
      this.logger.error(
        'POST /auth/cli-login-exchange - Failed to exchange CLI login code',
        {
          error: getErrorMessage(error),
        },
      );

      // Handle specific domain errors with appropriate HTTP status codes
      if (error instanceof CliLoginCodeNotFoundError) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error instanceof CliLoginCodeExpiredError) {
        throw new HttpException(error.message, HttpStatus.GONE);
      }

      throw error;
    }
  }

  @Get('onboarding-status')
  @HttpCode(HttpStatus.OK)
  async getOnboardingStatus(
    @Req() request: AuthenticatedRequest,
  ): Promise<GetUserOnboardingStatusResponse> {
    this.logger.log('GET /auth/onboarding-status - Getting onboarding status', {
      userId: request.user.userId,
      organizationId: request.organization.id,
    });

    try {
      const result = await this.authService.getUserOnboardingStatus(request);

      this.logger.log(
        'GET /auth/onboarding-status - Onboarding status retrieved successfully',
        {
          userId: request.user.userId,
          organizationId: request.organization.id,
          showOnboarding: result.showOnboarding,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(
        'GET /auth/onboarding-status - Failed to get onboarding status',
        {
          userId: request.user.userId,
          organizationId: request.organization.id,
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  @Post('complete-onboarding')
  @HttpCode(HttpStatus.OK)
  async completeOnboarding(
    @Req() request: AuthenticatedRequest,
  ): Promise<CompleteUserOnboardingResponse> {
    this.logger.log(
      'POST /auth/complete-onboarding - Completing user onboarding',
      {
        userId: request.user.userId,
        organizationId: request.organization.id,
      },
    );

    try {
      const result = await this.authService.completeUserOnboarding(request);

      this.logger.log(
        'POST /auth/complete-onboarding - User onboarding completed successfully',
        {
          userId: request.user.userId,
          organizationId: request.organization.id,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(
        'POST /auth/complete-onboarding - Failed to complete user onboarding',
        {
          userId: request.user.userId,
          organizationId: request.organization.id,
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  @Public()
  @Get('social/providers')
  @HttpCode(HttpStatus.OK)
  async getSocialProviders(): Promise<{ providers: SocialProvider[] }> {
    this.logger.log('GET /auth/social/providers - Getting available providers');
    const providers = await this.workOsService.getAvailableProviders();
    return { providers };
  }

  @Public()
  @Get('social/authorize/:provider')
  async socialAuthorize(
    @Param('provider') provider: string,
    @Res() response: Response,
  ): Promise<void> {
    this.logger.log(
      `GET /auth/social/authorize/${provider} - Initiating social login`,
    );

    const validProviders: SocialProvider[] = [
      'GoogleOAuth',
      'MicrosoftOAuth',
      'GitHubOAuth',
    ];

    if (!validProviders.includes(provider as SocialProvider)) {
      throw new HttpException('Invalid provider', HttpStatus.BAD_REQUEST);
    }

    const state = this.jwtService.sign(
      { purpose: 'social-login-state', provider },
      { expiresIn: '10m' },
    );

    const authorizationUrl = await this.workOsService.getAuthorizationUrl(
      provider as SocialProvider,
      state,
    );

    response.redirect(authorizationUrl);
  }

  @Public()
  @Get('social/callback')
  async socialCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() response: Response,
  ): Promise<void> {
    this.logger.log('GET /auth/social/callback - Processing OAuth callback');

    try {
      // Validate CSRF state and extract provider
      const statePayload = this.jwtService.verify(state);
      if (statePayload.purpose !== 'social-login-state') {
        throw new Error('Invalid state token purpose');
      }
      const provider = statePayload.provider as SocialProvider;

      // Exchange code for user info
      const { email } = await this.workOsService.authenticateWithCode(code);

      // Sign in or create user
      const result = await this.authService.signInSocial(email, provider);

      // Get cookie security setting
      const cookieSecure = await Configuration.getConfig('COOKIE_SECURE');
      const isSecure = cookieSecure === 'true';

      // Set auth cookie with sameSite: 'lax' for OAuth redirect
      response.cookie('auth_token', result.accessToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      // Determine redirect URL
      let redirectUrl: string;
      if (result.isNewUser) {
        redirectUrl = '/sign-up/create-organization';
      } else if (result.organization) {
        redirectUrl = `/org/${result.organization.slug}`;
      } else {
        redirectUrl = '/sign-in?social=select-org';
      }

      this.logger.log('Social login callback successful', {
        email: maskEmail(email),
        isNewUser: result.isNewUser,
        redirectUrl,
      });

      response.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('Social login callback failed', {
        error: getErrorMessage(error),
      });
      response.redirect('/sign-in?error=social_login_failed');
    }
  }

  private maskToken(token: string): string {
    if (token.length <= 8) {
      return '***';
    }
    return `${token.slice(0, 4)}***${token.slice(-4)}`;
  }
}
