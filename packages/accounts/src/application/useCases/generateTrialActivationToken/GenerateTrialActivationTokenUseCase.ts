import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GenerateTrialActivationTokenCommand,
  GenerateTrialActivationTokenResponse,
  IAccountsPort,
  createUserId,
} from '@packmind/types';
import { TrialActivationService } from '../../services/TrialActivationService';

const origin = 'GenerateTrialActivationTokenUseCase';

export class GenerateTrialActivationTokenUseCase extends AbstractMemberUseCase<
  GenerateTrialActivationTokenCommand,
  GenerateTrialActivationTokenResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly trialActivationService: TrialActivationService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('GenerateTrialActivationTokenUseCase initialized');
  }

  protected async executeForMembers(
    command: GenerateTrialActivationTokenCommand & MemberContext,
  ): Promise<GenerateTrialActivationTokenResponse> {
    this.logger.info('Generating trial activation token', {
      userId: command.userId,
    });

    const userId = createUserId(command.userId);

    // Generate the trial activation token
    const trialActivation =
      await this.trialActivationService.generateTrialActivationToken(userId);

    this.logger.info('Trial activation token generated successfully', {
      userId: command.userId,
      trialActivationId: trialActivation.id,
    });

    return { activationToken: trialActivation.token };
  }
}
