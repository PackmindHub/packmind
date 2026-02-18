import { PackmindLogger, maskEmail } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  ISignInSocialUserUseCase,
  ISignUpWithOrganizationUseCase,
  SignInSocialUserCommand,
  SignInSocialUserResponse,
  User,
  UserSignedInEvent,
} from '@packmind/types';
import { UserService } from '../../services/UserService';
import { MembershipResolutionService } from '../../services/MembershipResolutionService';
import { UserMetadataService } from '../../services/UserMetadataService';

export class SignInSocialUserUseCase implements ISignInSocialUserUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly membershipResolutionService: MembershipResolutionService,
    private readonly userMetadataService: UserMetadataService,
    private readonly signUpWithOrganizationUseCase: ISignUpWithOrganizationUseCase,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      'SignInSocialUserUseCase',
    ),
  ) {}

  async execute(
    command: SignInSocialUserCommand,
  ): Promise<SignInSocialUserResponse> {
    const user = await this.userService.getUserByEmailCaseInsensitive(
      command.email,
    );

    if (!user) {
      return this.handleNewUser(command);
    }

    return this.handleExistingUser(user, command);
  }

  private async handleNewUser(
    command: SignInSocialUserCommand,
  ): Promise<SignInSocialUserResponse> {
    const signUpResult = await this.signUpWithOrganizationUseCase.execute({
      email: command.email,
      authType: 'social',
      socialProvider: command.socialProvider,
    });

    await this.userMetadataService.addSocialProvider(
      signUpResult.user.id,
      command.socialProvider,
    );

    this.logger.info('New user created via social login', {
      userId: signUpResult.user.id,
      email: maskEmail(command.email),
      organizationId: signUpResult.organization.id,
    });

    return {
      user: signUpResult.user,
      organization: signUpResult.organization,
      role: 'admin',
      isNewUser: true,
    };
  }

  private async handleExistingUser(
    user: User,
    command: SignInSocialUserCommand,
  ): Promise<SignInSocialUserResponse> {
    await this.userMetadataService.addSocialProvider(
      user.id,
      command.socialProvider,
    );

    const resolved =
      await this.membershipResolutionService.resolveUserOrganizations(user);

    const organizationId =
      resolved.organization?.id ?? resolved.organizations?.[0]?.organization.id;

    if (organizationId) {
      this.eventEmitterService.emit(
        new UserSignedInEvent({
          userId: user.id,
          organizationId,
          email: user.email,
          method: 'social',
          socialProvider: command.socialProvider,
          source: 'ui',
        }),
      );
    }

    this.logger.info('Existing user signed in via social login', {
      userId: user.id,
      email: maskEmail(user.email),
    });

    return { user, ...resolved, isNewUser: false };
  }
}
