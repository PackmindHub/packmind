import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  BatchRejectChangeProposalsCommand,
  BatchRejectChangeProposalsResponse,
  IAccountsPort,
  IPlaybookChangeManagementPort,
} from '@packmind/types';

const origin = 'BatchRejectChangeProposalsUseCase';

export class BatchRejectChangeProposalsUseCase extends AbstractMemberUseCase<
  BatchRejectChangeProposalsCommand,
  BatchRejectChangeProposalsResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly playbookChangeManagementPort: IPlaybookChangeManagementPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: BatchRejectChangeProposalsCommand & MemberContext,
  ): Promise<BatchRejectChangeProposalsResponse> {
    this.logger.info('Processing batch reject change proposals', {
      spaceId: command.spaceId,
      count: command.proposals.length,
    });

    let rejected = 0;
    const errors: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < command.proposals.length; i++) {
      const proposal = command.proposals[i];

      try {
        await this.playbookChangeManagementPort.rejectCommandChangeProposal({
          userId: command.userId,
          organizationId: command.organizationId,
          spaceId: command.spaceId,
          recipeId: proposal.recipeId,
          changeProposalId: proposal.changeProposalId,
        });
        rejected++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ index: i, message });
      }
    }

    this.logger.info('Batch reject change proposals processed', {
      spaceId: command.spaceId,
      rejected,
      errors: errors.length,
    });

    return { rejected, errors };
  }
}
