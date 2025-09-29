import { Injectable, Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AccountsHexa,
  UserOrganizationMembership,
  UserOrganizationRole,
  createOrganizationId,
  OrganizationId,
  SignInUserCommand,
  SignUpUserCommand,
  UserId,
  GenerateApiKeyCommand,
  GetCurrentApiKeyCommand,
  SignInUserResponse,
  createUserId,
} from '@packmind/accounts';
import {
  ActivateUserAccountCommand,
  ActivateUserAccountResponse,
} from '@packmind/shared';
import {
  SignUpWithOrganizationCommand,
  SignUpWithOrganizationResponse,
  CheckEmailAvailabilityCommand,
  CheckEmailAvailabilityResponse,
} from '@packmind/shared';

import {
  PackmindCommand,
  PackmindCommandBody,
  PackmindLogger,
} from '@packmind/shared';
import { JwtPayload } from './JwtPayload';
import { AuthenticatedRequest } from '@packmind/shared-nest';

export interface TokenRequestBody {
  grant_type: string;
  email: string;
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

export interface GetMeResponse {
  user: {
    id: UserId;
    email: string;
    memberships: UserOrganizationMembership[];
  };
  organization: {
    id: OrganizationId;
    name: string;
    slug: string;
    role: UserOrganizationRole;
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

export interface SelectOrganizationCommand {
  organizationId: OrganizationId;
}

export interface SelectOrganizationResponse {
  message: string;
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

  async signUp(
    signUpRequest: SignUpUserCommand,
  ): Promise<SignUpWithOrganizationResponse> {
    this.logger.log(`Attempting to sign up user: ${signUpRequest.email}`);

    try {
      if (!signUpRequest.organizationName) {
        throw new Error('organizationName is required');
      }

      const command: SignUpWithOrganizationCommand = {
        organizationName: signUpRequest.organizationName,
        email: signUpRequest.email,
        password: signUpRequest.password,
      };

      const result = await this.accountsHexa.signUpWithOrganization(command);
      this.logger.log(
        `User signed up with organization successfully: ${result.user.email}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Sign up failed for user: ${signUpRequest.email}`,
        error,
      );
      throw error;
    }
  }

  async checkEmailAvailability(
    command: CheckEmailAvailabilityCommand,
  ): Promise<CheckEmailAvailabilityResponse> {
    this.logger.log(`Checking email availability for: ${command.email}`);

    try {
      const result = await this.accountsHexa.checkEmailAvailability(command);

      this.logger.log(
        `Email availability checked successfully: ${command.email} - Available: ${result.available}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Email availability check failed for: ${command.email}`,
        error,
      );
      throw error;
    }
  }

  async signIn(
    signInRequest: SignInUserCommand,
  ): Promise<SignInUserResponse & { accessToken: string }> {
    this.logger.log(`Attempting to sign in user: ${signInRequest.email}`);

    try {
      // Use the SignInUser use case
      const signInUserResponse =
        await this.accountsHexa.signInUser(signInRequest);

      // Create JWT payload
      const payload = {
        user: {
          name: signInUserResponse.user.email,
          userId: signInUserResponse.user.id,
        },
        memberships: signInUserResponse.user.memberships,
        organization: signInUserResponse.organization
          ? {
              id: signInUserResponse.organization.id,
              name: signInUserResponse.organization.name,
              slug: signInUserResponse.organization.slug,
              role: signInUserResponse.role,
            }
          : undefined,
      };

      // Generate access token
      const accessToken = this.jwtService.sign(payload);

      this.logger.log(
        `User signed in successfully: ${signInUserResponse.user.email}`,
      );

      return { ...signInUserResponse, accessToken };
    } catch (error) {
      this.logger.error(
        `Sign in failed for user: ${signInRequest.email}`,
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

      const memberships = payload.memberships?.map((membership) => ({
        userId: payload.user.userId,
        organizationId: createOrganizationId(membership.organizationId),
        role: membership.role,
      })) || [
        {
          userId: payload.user.userId,
          organizationId: createOrganizationId(payload.organization.id),
          role: payload.organization.role,
        },
      ];

      return {
        user: {
          id: payload.user.userId,
          email: payload.user.name,
          memberships,
        },
        organization: {
          id: createOrganizationId(payload.organization.id),
          name: payload.organization.name,
          slug: payload.organization.slug,
          role: payload.organization.role,
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

  /**
   * Validates an invitation token and returns email and validity status
   */
  async validateInvitationToken(request: {
    token: string;
  }): Promise<{ email: string; isValid: boolean }> {
    this.logger.log('Attempting to validate invitation token', {
      token: this.maskToken(request.token),
    });

    try {
      const result = await this.accountsHexa.validateInvitationToken({
        token: request.token,
      });

      this.logger.log('Invitation token validation completed', {
        token: this.maskToken(request.token),
        isValid: result.isValid,
        hasEmail: !!result.email,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to validate invitation token', {
        token: this.maskToken(request.token),
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Activates a user account using an invitation token and password
   */
  async activateAccount(request: {
    token: string;
    password: string;
  }): Promise<ActivateUserAccountResponse & { authToken?: string }> {
    this.logger.log('Attempting to activate user account', {
      token: this.maskToken(request.token),
    });

    try {
      const command: ActivateUserAccountCommand = {
        token: request.token,
        password: request.password,
      };

      const result = await this.accountsHexa.activateUserAccount(command);

      // Generate auth token for auto-login (same as signin flow)
      let authToken: string | undefined;
      if (result.success) {
        // Get the full user details for token generation
        const user = await this.accountsHexa.getUserById({
          userId: createUserId(result.user.id),
        });

        if (user && user.memberships && user.memberships.length > 0) {
          // Get organization details for the first membership
          const membership = user.memberships[0];
          const organization = await this.accountsHexa.getOrganizationById({
            organizationId: membership.organizationId,
          });

          // Create JWT payload (same structure as signin)
          const payload = {
            user: {
              name: user.email,
              userId: user.id,
            },
            organization: organization
              ? {
                  id: organization.id,
                  name: organization.name,
                  slug: organization.slug,
                  role: membership.role,
                }
              : null,
            memberships: user.memberships,
          };

          authToken = this.jwtService.sign(payload);
        }
      }

      this.logger.log('User account activated successfully', {
        userId: result.user.id,
        email: result.user.email,
      });

      return {
        ...result,
        authToken,
      };
    } catch (error) {
      this.logger.error('Failed to activate user account', {
        token: this.maskToken(request.token),
        error: error.message,
      });
      throw error;
    }
  }

  private maskToken(token: string): string {
    if (token.length <= 8) {
      return '***';
    }
    return `${token.slice(0, 4)}***${token.slice(-4)}`;
  }

  async selectOrganization(
    accessToken: string,
    command: SelectOrganizationCommand,
  ): Promise<{ accessToken: string } & SelectOrganizationResponse> {
    this.logger.log(`Selecting organization ${command.organizationId}`);

    try {
      // Verify and decode the current JWT
      const payload = this.jwtService.verify(accessToken) as JwtPayload;

      // Validate that the user is a member of the requested organization
      const membership = payload.memberships?.find(
        (m) => m.organizationId === command.organizationId,
      );

      if (!membership) {
        throw new Error('User is not a member of the requested organization');
      }

      // Get organization details from the user's memberships
      // We need to fetch the organization details since memberships only have id and role
      const getUserResponse = await this.accountsHexa.getUserById({
        userId: payload.user.userId,
      });

      const userMembership = getUserResponse.memberships.find(
        (m) => m.organizationId === command.organizationId,
      );

      if (!userMembership) {
        throw new Error('Organization membership not found');
      }

      // Get the organization details
      const organizationResponse = await this.accountsHexa.getOrganizationById({
        organizationId: command.organizationId,
      });

      if (!organizationResponse) {
        throw new Error('Organization not found');
      }

      // Create new JWT payload with the selected organization
      // Build fresh payload without JWT standard claims to avoid conflicts
      const newPayload = {
        user: payload.user,
        memberships: payload.memberships,
        organization: {
          id: organizationResponse.id,
          name: organizationResponse.name,
          slug: organizationResponse.slug,
          role: userMembership.role,
        },
      };

      // Generate new access token
      const newAccessToken = this.jwtService.sign(newPayload);

      this.logger.log(
        `Organization ${command.organizationId} selected successfully for user ${payload.user.userId}`,
      );

      return {
        accessToken: newAccessToken,
        message: 'Organization selected successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to select organization ${command.organizationId}`,
        error,
      );
      throw error;
    }
  }
}
