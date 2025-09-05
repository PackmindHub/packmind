import { Injectable, Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AccountsHexa,
  createOrganizationId,
  OrganizationId,
  SignInUserCommand,
  SignUpUserCommand,
  User,
  UserId,
  GenerateApiKeyCommand,
  GetCurrentApiKeyCommand,
} from '@packmind/accounts';

import {
  PackmindCommand,
  PackmindCommandBody,
  PackmindLogger,
} from '@packmind/shared';
import { JwtPayload } from './JwtPayload';
import { AuthenticatedRequest } from '@packmind/shared-nest';

export interface TokenRequestBody {
  grant_type: string;
  username: string;
  password: string;
  client_id?: string;
  scope?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface SignInUserResponse {
  user: {
    id: UserId;
    username: string;
    organizationId: OrganizationId;
  };
  organization: {
    id: OrganizationId;
    name: string;
    slug: string;
  };
  accessToken: string;
}

export interface GetMeResponse {
  user: {
    id: UserId;
    username: string;
    organizationId: OrganizationId;
  };
  organization: {
    id: OrganizationId;
    name: string;
    slug: string;
  };
  authenticated: boolean;
  message?: string;
}

export interface GenerateApiKeyResponse {
  apiKey: string;
  expiresAt: Date;
}

export interface GetCurrentApiKeyResponse {
  hasApiKey: boolean;
  expiresAt?: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('EnhancedAccountsHexa') private readonly accountsHexa: AccountsHexa,
    private readonly jwtService: JwtService,
    private readonly packmindLogger: PackmindLogger,
  ) {
    this.logger.log('AuthService initialized');
  }

  async signUp(signUpRequest: SignUpUserCommand): Promise<User> {
    this.logger.log(`Attempting to sign up user: ${signUpRequest.username}`);

    try {
      const user = await this.accountsHexa.signUpUser(signUpRequest);

      this.logger.log(`User signed up successfully: ${user.username}`);
      return user;
    } catch (error) {
      this.logger.error(
        `Sign up failed for user: ${signUpRequest.username}`,
        error,
      );
      throw error;
    }
  }

  async signIn(signInRequest: SignInUserCommand): Promise<SignInUserResponse> {
    this.logger.log(`Attempting to sign in user: ${signInRequest.username}`);

    try {
      // Use the SignInUser use case
      const { user, organization } =
        await this.accountsHexa.signInUser(signInRequest);

      // Create JWT payload
      const payload = {
        user: {
          name: user.username,
          userId: user.id,
        },
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
      };

      // Generate access token
      const accessToken = this.jwtService.sign(payload);

      this.logger.log(`User signed in successfully: ${user.username}`);

      return {
        user: {
          id: user.id,
          username: user.username,
          organizationId: createOrganizationId(user.organizationId),
        },
        organization: {
          id: createOrganizationId(organization.id),
          name: organization.name,
          slug: organization.slug,
        },
        accessToken,
      };
    } catch (error) {
      this.logger.error(
        `Sign in failed for user: ${signInRequest.username}`,
        error,
      );
      throw error;
    }
  }

  async getMe(accessToken?: string): Promise<GetMeResponse> {
    if (!accessToken) {
      return {
        message: 'No valid access token found',
        authenticated: false,
      } as GetMeResponse;
    }

    try {
      // Verify and decode the JWT
      const payload = this.jwtService.verify(accessToken) as JwtPayload;

      return {
        user: {
          id: payload.user.userId,
          username: payload.user.name,
          organizationId: createOrganizationId(payload.organization.id),
        },
        organization: {
          id: createOrganizationId(payload.organization.id),
          name: payload.organization.name,
          slug: payload.organization.slug,
        },
        authenticated: true,
      };
    } catch {
      this.logger.warn('Invalid or expired access token');
      return {
        message: 'Invalid or expired access token',
        authenticated: false,
      } as GetMeResponse;
    }
  }

  makePackmindCommand<Command extends PackmindCommand>(
    req: AuthenticatedRequest,
    bodyOrParams?: PackmindCommandBody<Command>,
  ): Command {
    return {
      userId: req.user.userId,
      organizationId: req.organization.id,
      ...bodyOrParams,
    } as unknown as Command;
  }

  /**
   * Generates a new API key for the authenticated user
   * @param req Authenticated request containing user and organization info
   * @param host API host URL
   * @returns Generated API key and expiration info
   */
  async generateApiKey(
    req: AuthenticatedRequest,
    host: string,
  ): Promise<GenerateApiKeyResponse> {
    this.logger.log(`Generating API key for user ${req.user.userId}`);

    try {
      const command: GenerateApiKeyCommand = {
        userId: req.user.userId,
        organizationId: req.organization.id,
        host,
      };

      const result = await this.accountsHexa.generateApiKey(command);

      this.logger.log(
        `API key generated successfully for user ${req.user.userId}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to generate API key for user ${req.user.userId}`,
        error,
      );
      throw new Error(`Failed to generate API key: ${error.message}`);
    }
  }

  /**
   * Gets current API key information (without revealing the actual key)
   * Note: This is a simplified implementation since we don't store API keys
   * In a real implementation, you might want to track issued keys
   */
  async getCurrentApiKey(
    req: AuthenticatedRequest,
  ): Promise<GetCurrentApiKeyResponse> {
    this.logger.log(`Getting current API key info for user ${req.user.userId}`);

    try {
      const command: GetCurrentApiKeyCommand = {
        userId: req.user.userId,
      };

      const result = await this.accountsHexa.getCurrentApiKey(command);

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get current API key for user ${req.user.userId}`,
        error,
      );
      throw new Error(`Failed to get current API key: ${error.message}`);
    }
  }
}
