import {
  ISignInUserUseCase,
  SignInUserCommand,
  SignInUserResponse,
} from '../../../domain/useCases/ISignInUserUseCase';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { LoginRateLimiterService } from '../../services/LoginRateLimiterService';
import { UnauthorizedException } from '@nestjs/common';
import { MissingEmailError } from '../../../domain/errors/MissingEmailError';

export class SignInUserUseCase implements ISignInUserUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly loginRateLimiterService: LoginRateLimiterService,
  ) {}

  async execute(command: SignInUserCommand): Promise<SignInUserResponse> {
    if (!command.email) {
      throw new MissingEmailError();
    }

    // Check if user is allowed to attempt login (rate limiting)
    await this.loginRateLimiterService.checkLoginAllowed(command.email);

    // Find user by email (case-insensitive)
    const user = await this.userService.getUserByEmailCaseInsensitive(
      command.email,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Validate password
    const isPasswordValid = await this.userService.validatePassword(
      command.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      // Only record failed attempt for invalid password (not for user not found, etc.)
      await this.loginRateLimiterService.recordFailedAttempt(command.email);
      throw new UnauthorizedException('Invalid email or password');
    }

    // If user has no memberships, allow them to sign in to create an organization
    if (user.memberships.length === 0) {
      // Successful login - clear any previous failed attempts
      await this.loginRateLimiterService.clearAttempts(command.email);

      return {
        user,
        organizations: [],
      };
    }

    // If user belongs to a single organization, return the same behavior
    if (user.memberships.length === 1) {
      const membership = user.memberships[0];
      const organization = await this.organizationService.getOrganizationById(
        membership.organizationId,
      );

      if (!organization) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Successful login - clear any previous failed attempts
      await this.loginRateLimiterService.clearAttempts(command.email);

      return {
        user,
        organization,
        role: membership.role,
      };
    }

    // If user belongs to multiple organizations, return the list of available organizations
    const organizationsWithRoles = await Promise.all(
      user.memberships.map(async (membership) => {
        const organization = await this.organizationService.getOrganizationById(
          membership.organizationId,
        );

        if (!organization) {
          throw new UnauthorizedException('Invalid credentials');
        }

        return {
          organization,
          role: membership.role,
        };
      }),
    );

    // Successful login - clear any previous failed attempts
    await this.loginRateLimiterService.clearAttempts(command.email);

    return {
      user,
      organizations: organizationsWithRoles,
    };
  }
}
