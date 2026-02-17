import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  ISignInUserUseCase,
  SignInUserCommand,
  SignInUserResponse,
  UserSignedInEvent,
} from '@packmind/types';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { LoginRateLimiterService } from '../../services/LoginRateLimiterService';
import { MissingEmailError } from '../../../domain/errors/MissingEmailError';
import { InvalidEmailOrPasswordError } from '../../../domain/errors/InvalidEmailOrPasswordError';

export class SignInUserUseCase implements ISignInUserUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly loginRateLimiterService: LoginRateLimiterService,
    private readonly eventEmitterService: PackmindEventEmitterService,
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
      throw new InvalidEmailOrPasswordError();
    }

    // Validate password
    const isPasswordValid = await this.userService.validatePassword(
      command.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      // Only record failed attempt for invalid password (not for user not found, etc.)
      await this.loginRateLimiterService.recordFailedAttempt(command.email);
      throw new InvalidEmailOrPasswordError();
    }

    // If user has no memberships, allow them to sign in to create an organization
    // No UserSignedInEvent emitted here: event requires organizationId which is unavailable without memberships
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
        throw new InvalidEmailOrPasswordError();
      }

      // Successful login - clear any previous failed attempts
      await this.loginRateLimiterService.clearAttempts(command.email);

      this.eventEmitterService.emit(
        new UserSignedInEvent({
          userId: user.id,
          organizationId: organization.id,
          email: user.email,
          authType: 'password',
          source: 'ui',
        }),
      );

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
          throw new InvalidEmailOrPasswordError();
        }

        return {
          organization,
          role: membership.role,
        };
      }),
    );

    // Successful login - clear any previous failed attempts
    await this.loginRateLimiterService.clearAttempts(command.email);

    this.eventEmitterService.emit(
      new UserSignedInEvent({
        userId: user.id,
        organizationId: organizationsWithRoles[0].organization.id,
        email: user.email,
        authType: 'password',
        source: 'ui',
      }),
    );

    return {
      user,
      organizations: organizationsWithRoles,
    };
  }
}
