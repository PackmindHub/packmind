import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  UserOrganizationRole,
  createOrganizationId,
  OrganizationId,
  UserId,
  createUserId,
  IAccountsPort,
  ActivateTrialAccountCommand,
  ActivateTrialAccountResult,
  createTrialActivationToken,
  GetUserOnboardingStatusResponse,
  CompleteUserOnboardingResponse,
  SocialProvider,
  SOCIAL_PROVIDER_DISPLAY_NAMES,
} from '@packmind/types';
import {
  SignInUserCommand,
  SignInUserResponse,
  GenerateApiKeyCommand,
  GetCurrentApiKeyCommand,
  ActivateUserAccountCommand,
  ActivateUserAccountResponse,
  RequestPasswordResetCommand,
  RequestPasswordResetResponse,
  ResetPasswordCommand,
  ResetPasswordResponse,
  ValidatePasswordResetTokenCommand,
  ValidatePasswordResetTokenResponse,
  SignUpWithOrganizationCommand,
  SignUpWithOrganizationResponse,
  CheckEmailAvailabilityCommand,
  CheckEmailAvailabilityResponse,
  CreateCliLoginCodeCommand,
  CreateCliLoginCodeResponse,
  ExchangeCliLoginCodeCommand,
  ExchangeCliLoginCodeResponse,
} from '@packmind/accounts';
import { InjectAccountsAdapter } from '../shared/HexaInjection';
import { maskEmail } from '@packmind/logger';
import { getErrorMessage } from '../shared/utils/error.utils';

import { PackmindLogger } from '@packmind/logger';
import { PackmindCommand, PackmindCommandBody, User } from '@packmind/types';
import { JwtPayload } from './JwtPayload';
import { AuthenticatedRequest } from '@packmind/node-utils';

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
  };
  organization?: {
    id: OrganizationId;
    name: string;
    slug: string;
    role: UserOrganizationRole;
  };
  organizations?: Array<{
    organization: {
      id: OrganizationId;
      name: string;
      slug: string;
    };
    role: UserOrganizationRole;
  }>;
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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectAccountsAdapter() private readonly accountsAdapter: IAccountsPort,
    private readonly jwtService: JwtService,
    private readonly packmindLogger: PackmindLogger,
  ) {
    this.logger.log('AuthService initialized');
  }

  async signUp(
    signUpRequest: SignUpWithOrganizationCommand,
  ): Promise<SignUpWithOrganizationResponse> {
    this.logger.log('Attempting to sign up user', {
      email: maskEmail(signUpRequest.email),
    });

    try {
      const result =
        await this.accountsAdapter.signUpWithOrganization(signUpRequest);
      this.logger.log('User signed up with organization successfully', {
        email: maskEmail(result.user.email),
      });
      return result;
    } catch (error) {
      this.logger.error('Sign up failed for user', {
        email: maskEmail(signUpRequest.email),
        error,
      });
      throw error;
    }
  }

  async checkEmailAvailability(
    command: CheckEmailAvailabilityCommand,
  ): Promise<CheckEmailAvailabilityResponse> {
    this.logger.log('Checking email availability', {
      email: maskEmail(command.email),
    });

    try {
      const result = await this.accountsAdapter.checkEmailAvailability(command);

      this.logger.log('Email availability checked successfully', {
        email: maskEmail(command.email),
        available: result.available,
      });
      return result;
    } catch (error) {
      this.logger.error('Email availability check failed', {
        email: maskEmail(command.email),
        error,
      });
      throw error;
    }
  }

  async signIn(
    signInRequest: SignInUserCommand,
  ): Promise<SignInUserResponse & { accessToken: string }> {
    this.logger.log('Attempting to sign in user', {
      email: maskEmail(signInRequest.email),
    });

    // Use the SignInUser use case
    const signInUserResponse =
      await this.accountsAdapter.signInUser(signInRequest);

    // Create JWT payload
    const payload = {
      user: {
        name: signInUserResponse.user.email,
        userId: signInUserResponse.user.id,
      },
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

    this.logger.log('User signed in successfully', {
      email: maskEmail(signInUserResponse.user.email),
    });

    return { ...signInUserResponse, accessToken };
  }

  async signInSocial(
    email: string,
    provider: SocialProvider,
  ): Promise<{
    accessToken: string;
    user: { id: UserId; email: string };
    organization?: { id: OrganizationId; name: string; slug: string };
    organizations?: Array<{
      organization: { id: OrganizationId; name: string; slug: string };
      role: UserOrganizationRole;
    }>;
    isNewUser: boolean;
  }> {
    const providerName = SOCIAL_PROVIDER_DISPLAY_NAMES[provider];
    this.logger.log(
      `User attempting social login with provider ${providerName}`,
      {
        email: maskEmail(email),
      },
    );

    let user: User | null = await this.accountsAdapter.getUserByEmail(email);
    let isNewUser = false;
    let organization:
      | { id: OrganizationId; name: string; slug: string }
      | undefined;
    let organizations:
      | Array<{
          organization: { id: OrganizationId; name: string; slug: string };
          role: UserOrganizationRole;
        }>
      | undefined;

    if (!user) {
      const result = await this.accountsAdapter.signUpWithOrganization({
        email,
        authType: 'social',
        socialProvider: provider,
      });

      user = result.user;
      isNewUser = true;

      await this.accountsAdapter.addSocialProvider(user.id, provider);

      organization = {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      };

      this.logger.log('New user created via social login with organization', {
        userId: user.id,
        email: maskEmail(email),
        organizationId: result.organization.id,
      });
    } else {
      // Existing user — track provider in metadata
      await this.accountsAdapter.addSocialProvider(user.id, provider);
      this.logger.log(
        `User ${user.id} logged in with provider ${providerName}`,
        {
          email: maskEmail(email),
        },
      );
    }

    const memberships = user.memberships ?? [];

    if (!isNewUser) {
      if (memberships.length === 1) {
        const membership = memberships[0];
        const org = await this.accountsAdapter.getOrganizationById({
          organizationId: membership.organizationId,
        });
        if (org) {
          organization = { id: org.id, name: org.name, slug: org.slug };
        }
      } else if (memberships.length > 1) {
        organizations = await Promise.all(
          memberships.map(async (membership) => {
            const org = await this.accountsAdapter.getOrganizationById({
              organizationId: membership.organizationId,
            });
            return org
              ? {
                  organization: {
                    id: org.id,
                    name: org.name,
                    slug: org.slug,
                  },
                  role: membership.role,
                }
              : null;
          }),
        ).then((orgs) =>
          orgs.filter((o): o is NonNullable<typeof o> => o !== null),
        );
      }
    }

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
            role: memberships[0]?.role ?? ('admin' as UserOrganizationRole),
          }
        : undefined,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log('Social sign-in successful', {
      userId: user.id,
      email: maskEmail(user.email),
      isNewUser,
      orgCount: memberships.length,
    });

    return {
      accessToken,
      user: { id: user.id, email: user.email },
      organization,
      organizations,
      isNewUser,
    };
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
      const payload: JwtPayload = this.jwtService.verify(accessToken);

      // Check if organization is present in the token
      if (!payload.organization) {
        this.logger.log(
          'User is authenticated but has not selected an organization',
          {
            userId: payload.user.userId,
          },
        );

        // Fetch user to get their organizations
        const user = await this.accountsAdapter.getUserById({
          userId: payload.user.userId,
        });

        if (!user) {
          this.logger.warn('User not found', {
            userId: payload.user.userId,
          });
          return {
            message: 'User not found',
            authenticated: false,
          } as GetMeResponse;
        }

        // Fetch organization details for each membership
        const organizationsWithDetails = await Promise.all(
          user.memberships.map(async (membership) => {
            const org = await this.accountsAdapter.getOrganizationById({
              organizationId: membership.organizationId,
            });

            if (!org) {
              this.logger.warn('Organization not found', {
                organizationId: membership.organizationId,
              });
              return null;
            }

            return {
              organization: {
                id: org.id,
                name: org.name,
                slug: org.slug,
              },
              role: membership.role,
            };
          }),
        ).then((orgs) =>
          orgs.filter((org): org is NonNullable<typeof org> => org !== null),
        );

        return {
          user: {
            id: user.id,
            email: user.email,
          },
          organizations: organizationsWithDetails,
          message: 'User is authenticated but has not selected an organization',
          authenticated: true,
        } as GetMeResponse;
      }

      // At this point, payload.organization must exist (checked above)
      if (!payload.organization) {
        throw new Error('Organization not found in token after check');
      }

      // Store the non-null organization for TypeScript narrowing
      const tokenOrganization = payload.organization;

      // Verify that the user has access to the organization in the token
      const user = await this.accountsAdapter.getUserById({
        userId: payload.user.userId,
      });

      if (!user) {
        this.logger.warn('User not found', {
          userId: payload.user.userId,
        });
        return {
          message: 'User not found',
          authenticated: false,
        } as GetMeResponse;
      }

      const organizationMembership = user.memberships.find(
        (membership) => membership.organizationId === tokenOrganization.id,
      );

      if (!organizationMembership) {
        this.logger.warn('User does not have access to organization', {
          userId: payload.user.userId,
          organizationId: tokenOrganization.id,
        });
        return {
          message: 'User does not have access to the organization in token',
          authenticated: false,
        } as GetMeResponse;
      }

      const org = await this.accountsAdapter.getOrganizationById({
        organizationId: organizationMembership.organizationId,
      });

      if (!org) {
        this.logger.warn('Organization not found', {
          organizationId: organizationMembership.organizationId,
        });
        return {
          message: 'Organization not found',
          authenticated: false,
        } as GetMeResponse;
      }

      return {
        user: {
          id: user.id,
          email: user.email,
        },
        organization: {
          id: createOrganizationId(organizationMembership.organizationId),
          name: org.name,
          slug: org.slug,
          role: organizationMembership.role,
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
   * @returns Generated API key and expiration info
   */
  async generateApiKey(
    req: AuthenticatedRequest,
  ): Promise<GenerateApiKeyResponse> {
    this.logger.log('Generating API key for user', {
      userId: req.user.userId,
    });

    try {
      const command: GenerateApiKeyCommand = {
        userId: req.user.userId,
        organizationId: req.organization.id,
      };

      const result = await this.accountsAdapter.generateApiKey(command);

      this.logger.log('API key generated successfully for user', {
        userId: req.user.userId,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to generate API key for user', {
        userId: req.user.userId,
        error,
      });
      throw new Error('Failed to generate API key: ' + getErrorMessage(error));
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
    this.logger.log('Getting current API key info for user', {
      userId: req.user.userId,
    });

    try {
      const command: GetCurrentApiKeyCommand = {
        userId: req.user.userId,
      };

      const result = await this.accountsAdapter.getCurrentApiKey(command);

      return result;
    } catch (error) {
      this.logger.error('Failed to get current API key for user', {
        userId: req.user.userId,
        error,
      });
      throw new Error(
        'Failed to get current API key: ' + getErrorMessage(error),
      );
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
      const result = await this.accountsAdapter.validateInvitationToken({
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
        error: getErrorMessage(error),
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

      const result = await this.accountsAdapter.activateUserAccount(command);

      // Generate auth token for auto-login (same as signin flow)
      let authToken: string | undefined;
      if (result.success) {
        // Get the full user details for token generation
        const user = await this.accountsAdapter.getUserById({
          userId: createUserId(result.user.id),
        });

        if (user && user.memberships && user.memberships.length > 0) {
          // Get organization details for the first membership
          const membership = user.memberships[0];
          const organization = await this.accountsAdapter.getOrganizationById({
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
        email: maskEmail(result.user.email),
      });

      return {
        ...result,
        authToken,
      };
    } catch (error) {
      this.logger.error('Failed to activate user account', {
        token: this.maskToken(request.token),
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  private maskToken(token: string): string {
    if (token.length <= 8) {
      return '***';
    }
    return token.slice(0, 4) + '***' + token.slice(-4);
  }

  async selectOrganization(
    accessToken: string,
    command: SelectOrganizationCommand,
  ): Promise<{ accessToken: string }> {
    this.logger.log('Selecting organization', {
      organizationId: command.organizationId,
    });

    try {
      // Verify and decode the current JWT
      const payload: JwtPayload = this.jwtService.verify(accessToken);

      // Get organization details from the user's memberships
      // We need to fetch the organization details since memberships only have id and role
      const getUserResponse = await this.accountsAdapter.getUserById({
        userId: payload.user.userId,
      });

      if (!getUserResponse) {
        throw new Error('User not found');
      }

      const userMembership = getUserResponse.memberships.find(
        (m) => m.organizationId === command.organizationId,
      );

      if (!userMembership) {
        throw new Error('Organization membership not found');
      }

      // Get the organization details
      const organizationResponse =
        await this.accountsAdapter.getOrganizationById({
          organizationId: command.organizationId,
        });

      if (!organizationResponse) {
        throw new Error('Organization not found');
      }

      // Create new JWT payload with the selected organization
      // Build fresh payload without JWT standard claims to avoid conflicts
      const newPayload = {
        user: payload.user,
        organization: {
          id: organizationResponse.id,
          name: organizationResponse.name,
          slug: organizationResponse.slug,
          role: userMembership.role,
        },
      };

      // Generate new access token
      const newAccessToken = this.jwtService.sign(newPayload);

      this.logger.log('Organization selected successfully for user', {
        organizationId: command.organizationId,
        userId: payload.user.userId,
      });

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      this.logger.error('Failed to select organization', {
        organizationId: command.organizationId,
        error,
      });
      throw error;
    }
  }

  /**
   * Requests a password reset by sending a reset link via email
   */
  async requestPasswordReset(
    command: RequestPasswordResetCommand,
  ): Promise<RequestPasswordResetResponse> {
    this.logger.log('Attempting to request password reset', {
      email: maskEmail(command.email),
    });

    try {
      const result = await this.accountsAdapter.requestPasswordReset(command);

      this.logger.log('Password reset request completed', {
        email: maskEmail(command.email),
        success: result.success,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to request password reset', {
        email: maskEmail(command.email),
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Validates a password reset token and returns email and validity status
   */
  async validatePasswordResetToken(request: {
    token: string;
  }): Promise<ValidatePasswordResetTokenResponse> {
    this.logger.log('Attempting to validate password reset token', {
      token: this.maskToken(request.token),
    });

    try {
      const command: ValidatePasswordResetTokenCommand = {
        token: request.token,
      };

      const result =
        await this.accountsAdapter.validatePasswordResetToken(command);

      this.logger.log('Password reset token validation completed', {
        token: this.maskToken(request.token),
        isValid: result.isValid,
        hasEmail: !!result.email,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to validate password reset token', {
        token: this.maskToken(request.token),
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Activates a trial account using an activation token
   * Sets email, password, and organization name for the trial user
   */
  async activateTrialAccount(request: {
    activationToken: string;
    email: string;
    password: string;
    organizationName: string;
  }): Promise<ActivateTrialAccountResult & { authToken?: string }> {
    this.logger.log('Attempting to activate trial account', {
      token: this.maskToken(request.activationToken),
      email: maskEmail(request.email),
    });

    try {
      const command: ActivateTrialAccountCommand = {
        activationToken: createTrialActivationToken(request.activationToken),
        email: request.email,
        password: request.password,
        organizationName: request.organizationName,
      };

      const result = await this.accountsAdapter.activateTrialAccount(command);

      // Generate auth token for auto-login (same as signin flow)
      let authToken: string | undefined;
      if (result.user && result.organization) {
        // Create JWT payload (same structure as signin)
        const payload = {
          user: {
            name: result.user.email,
            userId: result.user.id,
          },
          organization: {
            id: result.organization.id,
            name: result.organization.name,
            slug: result.organization.slug,
            role: 'admin' as UserOrganizationRole,
          },
          memberships: result.user.memberships,
        };

        authToken = this.jwtService.sign(payload);
      }

      this.logger.log('Trial account activated successfully', {
        userId: String(result.user.id),
        email: maskEmail(result.user.email),
        organizationId: String(result.organization.id),
      });

      return {
        ...result,
        authToken,
      };
    } catch (error) {
      this.logger.error('Failed to activate trial account', {
        token: this.maskToken(request.activationToken),
        email: maskEmail(request.email),
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Resets a user's password using a valid token and generates auth token for auto-login
   */
  async resetPassword(request: {
    token: string;
    password: string;
  }): Promise<ResetPasswordResponse & { authToken?: string }> {
    this.logger.log('Attempting to reset password', {
      token: this.maskToken(request.token),
    });

    try {
      const command: ResetPasswordCommand = {
        token: request.token,
        password: request.password,
      };

      const result = await this.accountsAdapter.resetPassword(command);

      // Generate auth token for auto-login (same as signin flow)
      let authToken: string | undefined;
      if (result.success) {
        // Get the full user details for token generation
        const user = await this.accountsAdapter.getUserById({
          userId: createUserId(result.user.id),
        });

        if (user && user.memberships && user.memberships.length > 0) {
          // Get organization details for the first membership
          const membership = user.memberships[0];
          const organization = await this.accountsAdapter.getOrganizationById({
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

      this.logger.log('Password reset completed successfully', {
        userId: result.user.id,
        email: maskEmail(result.user.email),
      });

      return {
        ...result,
        authToken,
      };
    } catch (error) {
      this.logger.error('Failed to reset password', {
        token: this.maskToken(request.token),
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Creates a CLI login code for the authenticated user
   * @param req Authenticated request containing user and organization info
   * @returns Generated CLI login code and expiration info
   */
  async createCliLoginCode(
    req: AuthenticatedRequest,
  ): Promise<CreateCliLoginCodeResponse> {
    this.logger.log('Creating CLI login code for user', {
      userId: req.user.userId,
      organizationId: req.organization.id,
    });

    try {
      const command: CreateCliLoginCodeCommand = {
        userId: req.user.userId,
        organizationId: req.organization.id,
      };

      const result = await this.accountsAdapter.createCliLoginCode(command);

      this.logger.log('CLI login code created successfully', {
        userId: req.user.userId,
        expiresAt: result.expiresAt.toISOString(),
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to create CLI login code', {
        userId: req.user.userId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Exchanges a CLI login code for an API key
   * @param command Contains the code to exchange
   * @returns API key and expiration info
   */
  async exchangeCliLoginCode(
    command: ExchangeCliLoginCodeCommand,
  ): Promise<ExchangeCliLoginCodeResponse> {
    this.logger.log('Exchanging CLI login code');

    try {
      const result = await this.accountsAdapter.exchangeCliLoginCode(command);

      this.logger.log('CLI login code exchanged successfully');

      return result;
    } catch (error) {
      this.logger.error('Failed to exchange CLI login code', {
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Gets the onboarding status for a user's organization
   * @param userId User ID
   * @param organizationId Organization ID
   * @returns Onboarding status including hasDeployed flag
   */
  async getOnboardingStatus(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<{ hasDeployed: boolean }> {
    this.logger.log('Fetching onboarding status', {
      userId,
      organizationId,
    });

    try {
      const status = await this.accountsAdapter.getOrganizationOnboardingStatus(
        {
          userId,
          organizationId,
        },
      );

      this.logger.log('Onboarding status fetched successfully', {
        userId,
        organizationId,
        hasDeployed: status.hasDeployed,
      });

      return { hasDeployed: status.hasDeployed };
    } catch (error) {
      this.logger.error('Failed to fetch onboarding status', {
        userId,
        organizationId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Verifies a JWT token and returns the payload
   * @param token JWT token to verify
   * @returns Decoded JWT payload
   */
  verifyToken(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token);
  }

  /**
   * Gets the user onboarding status for the authenticated user
   * @param req Authenticated request containing user and organization info
   * @returns User onboarding status including steps to show
   */
  async getUserOnboardingStatus(
    req: AuthenticatedRequest,
  ): Promise<GetUserOnboardingStatusResponse> {
    this.logger.log('Getting user onboarding status', {
      userId: req.user.userId,
      organizationId: req.organization.id,
    });

    try {
      const result = await this.accountsAdapter.getUserOnboardingStatus({
        userId: req.user.userId,
        organizationId: req.organization.id,
      });

      this.logger.log('User onboarding status retrieved successfully', {
        userId: req.user.userId,
        organizationId: req.organization.id,
        showOnboarding: result.showOnboarding,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to get user onboarding status', {
        userId: req.user.userId,
        organizationId: req.organization.id,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Marks the user onboarding as completed
   * @param req Authenticated request containing user and organization info
   * @returns Success status
   */
  async completeUserOnboarding(
    req: AuthenticatedRequest,
  ): Promise<CompleteUserOnboardingResponse> {
    this.logger.log('Completing user onboarding', {
      userId: req.user.userId,
      organizationId: req.organization.id,
    });

    try {
      const result = await this.accountsAdapter.completeUserOnboarding({
        userId: req.user.userId,
        organizationId: req.organization.id,
      });

      this.logger.log('User onboarding completed successfully', {
        userId: req.user.userId,
        organizationId: req.organization.id,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to complete user onboarding', {
        userId: req.user.userId,
        organizationId: req.organization.id,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }
}
