import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  CheckProviderAuthCommand,
  CheckProviderAuthResponse,
  IAccountsPort,
  ICheckProviderAuthUseCase,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';

const origin = 'CheckProviderAuthUseCase';

export class CheckProviderAuthUseCase
  extends AbstractMemberUseCase<
    CheckProviderAuthCommand,
    CheckProviderAuthResponse
  >
  implements ICheckProviderAuthUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly gitProviderService: GitProviderService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    logger.info('CheckProviderAuthUseCase initialized');
  }

  async executeForMembers(
    command: CheckProviderAuthCommand & MemberContext,
  ): Promise<CheckProviderAuthResponse> {
    const { gitProviderId } = command;
    const organizationId = command.organization.id;

    this.logger.info('Checking git provider auth', {
      organizationId,
      gitProviderId,
    });

    const gitProvider =
      await this.gitProviderService.findGitProviderById(gitProviderId);
    if (!gitProvider) {
      throw new Error('Git provider not found');
    }

    if (gitProvider.organizationId !== organizationId) {
      // Don't leak existence of providers in other organizations.
      throw new Error('Git provider not found');
    }

    return this.gitProviderService.checkProviderAuth(gitProviderId);
  }
}
