import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  ISignInUserUseCase,
  SignInUserCommand,
  SignInUserResponse,
  UserSignedInEvent,
} from '@packmind/types';
import { UserService } from '../../services/UserService';
import {
  MembershipResolutionService,
  getPrimaryOrganizationId,
} from '../../services/MembershipResolutionService';
import { LoginRateLimiterService } from '../../services/LoginRateLimiterService';
import { MissingEmailError } from '../../../domain/errors/MissingEmailError';
import { InvalidEmailOrPasswordError } from '../../../domain/errors/InvalidEmailOrPasswordError';

export class SignInUserUseCase implements ISignInUserUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly membershipResolutionService: MembershipResolutionService,
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

    // Successful login - clear any previous failed attempts
    await this.loginRateLimiterService.clearAttempts(command.email);

    const resolved =
      await this.membershipResolutionService.resolveUserOrganizations(user);

    // Emit event when organizationId is available
    const organizationId = getPrimaryOrganizationId(resolved);

    if (organizationId) {
      this.eventEmitterService.emit(
        new UserSignedInEvent({
          userId: user.id,
          organizationId,
          email: user.email,
          method: 'password',
          source: 'ui',
        }),
      );
    }

    return { user, ...resolved };
  }
}
