import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  BatchApplyChangeProposalsCommand,
  BatchApplyChangeProposalsResponse,
  IAccountsPort,
  IPlaybookChangeManagementPort,
} from '@packmind/types';

const origin = 'BatchApplyChangeProposalsUseCase';

export class BatchApplyChangeProposalsUseCase extends AbstractMemberUseCase<
  BatchApplyChangeProposalsCommand,
  BatchApplyChangeProposalsResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly playbookChangeManagementPort: IPlaybookChangeManagementPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: BatchApplyChangeProposalsCommand & MemberContext,
  ): Promise<BatchApplyChangeProposalsResponse> {
    this.logger.info('Processing batch apply change proposals', {
      spaceId: command.spaceId,
      count: command.proposals.length,
    });

    let applied = 0;
    const errors: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < command.proposals.length; i++) {
      const proposal = command.proposals[i];

      try {
        await this.playbookChangeManagementPort.applyCommandChangeProposal({
          userId: command.userId,
          organizationId: command.organizationId,
          spaceId: command.spaceId,
          recipeId: proposal.recipeId,
          changeProposalId: proposal.changeProposalId,
          force: proposal.force,
        });
        applied++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ index: i, message });
      }
    }

    this.logger.info('Batch apply change proposals processed', {
      spaceId: command.spaceId,
      applied,
      errors: errors.length,
    });

    return { applied, errors };
  }
}
