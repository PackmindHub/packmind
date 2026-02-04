import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  CompleteUserOnboardingCommand,
  CompleteUserOnboardingResponse,
  IAccountsPort,
  ICompleteUserOnboardingUseCase,
} from '@packmind/types';
import { UserMetadataService } from '../../services/UserMetadataService';

const origin = 'CompleteUserOnboardingUseCase';

export class CompleteUserOnboardingUseCase
  extends AbstractMemberUseCase<
    CompleteUserOnboardingCommand,
    CompleteUserOnboardingResponse
  >
  implements ICompleteUserOnboardingUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly userMetadataService: UserMetadataService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('CompleteUserOnboardingUseCase initialized');
  }

  protected async executeForMembers(
    command: CompleteUserOnboardingCommand & MemberContext,
  ): Promise<CompleteUserOnboardingResponse> {
    const { user } = command;
    await this.userMetadataService.markOnboardingCompleted(user.id);
    return { success: true };
  }
}
