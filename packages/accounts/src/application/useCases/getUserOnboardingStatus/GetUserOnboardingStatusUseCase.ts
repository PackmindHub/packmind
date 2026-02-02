import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GetUserOnboardingStatusCommand,
  GetUserOnboardingStatusResponse,
  IAccountsPort,
  IGetUserOnboardingStatusUseCase,
} from '@packmind/types';
import { UserMetadataService } from '../../services/UserMetadataService';

const origin = 'GetUserOnboardingStatusUseCase';

const CREATOR_DETECTION_THRESHOLD_MS = 60 * 1000;

export class GetUserOnboardingStatusUseCase
  extends AbstractMemberUseCase<
    GetUserOnboardingStatusCommand,
    GetUserOnboardingStatusResponse
  >
  implements IGetUserOnboardingStatusUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly userMetadataService: UserMetadataService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('GetUserOnboardingStatusUseCase initialized');
  }

  protected async executeForMembers(
    command: GetUserOnboardingStatusCommand & MemberContext,
  ): Promise<GetUserOnboardingStatusResponse> {
    const { user, membership } = command;

    const onboardingCompleted = await this.userMetadataService.isOnboardingCompleted(user.id);
    const isOrganizationCreator = this.isUserOrganizationCreator(
      user.createdAt,
      membership.createdAt,
    );
    const showOnboarding = !onboardingCompleted;

    let stepsToShow: ('welcome' | 'playbook' | 'build')[] = [];
    if (showOnboarding) {
      stepsToShow = isOrganizationCreator
        ? ['welcome', 'playbook', 'build']
        : ['welcome', 'playbook'];
    }

    return { onboardingCompleted, isOrganizationCreator, showOnboarding, stepsToShow };
  }

  private isUserOrganizationCreator(
    userCreatedAt?: Date,
    membershipCreatedAt?: Date,
  ): boolean {
    if (!userCreatedAt || !membershipCreatedAt) {
      return false;
    }
    const timeDiffMs = Math.abs(
      userCreatedAt.getTime() - membershipCreatedAt.getTime(),
    );
    return timeDiffMs < CREATOR_DETECTION_THRESHOLD_MS;
  }
}
