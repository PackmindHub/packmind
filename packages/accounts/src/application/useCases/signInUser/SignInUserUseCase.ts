import { PackmindLogger } from '@packmind/logger';
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
import { OrganizationNotFoundError } from '../../../domain/errors/OrganizationNotFoundError';

export class SignInUserUseCase implements ISignInUserUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly membershipResolutionService: MembershipResolutionService,
    private readonly loginRateLimiterService: LoginRateLimiterService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      'SignInUserUseCase',
    ),
  ) {}

  async execute(command: SignInUserCommand): Promise<SignInUserResponse> {
    if (!command.email) {
      throw new MissingEmailError();
    }

    await this.loginRateLimiterService.checkLoginAllowed(command.email);

    const user = await this.userService.getUserByEmailCaseInsensitive(
      command.email,
    );
    if (!user) {
      throw new InvalidEmailOrPasswordError();
    }

    const isPasswordValid = await this.userService.validatePassword(
      command.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      // Only record failed attempt for invalid password (not for user not found, etc.)
      await this.loginRateLimiterService.recordFailedAttempt(command.email);
      throw new InvalidEmailOrPasswordError();
    }

    await this.loginRateLimiterService.clearAttempts(command.email);

    let resolved;
    try {
      resolved =
        await this.membershipResolutionService.resolveUserOrganizations(user);
    } catch (error) {
      if (error instanceof OrganizationNotFoundError) {
        throw new InvalidEmailOrPasswordError();
      }
      throw error;
    }

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
