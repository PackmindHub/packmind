import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  BatchCreateChangeProposalsCommand,
  BatchCreateChangeProposalsResponse,
  ChangeProposalType,
  CreateChangeProposalCommand,
  IAccountsPort,
  IPlaybookChangeManagementPort,
} from '@packmind/types';

const origin = 'BatchCreateChangeProposalsUseCase';

export class BatchCreateChangeProposalsUseCase extends AbstractMemberUseCase<
  BatchCreateChangeProposalsCommand,
  BatchCreateChangeProposalsResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly playbookChangeManagementPort: IPlaybookChangeManagementPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: BatchCreateChangeProposalsCommand & MemberContext,
  ): Promise<BatchCreateChangeProposalsResponse> {
    this.logger.info('Processing batch change proposals', {
      spaceId: command.spaceId,
      count: command.proposals.length,
    });

    let created = 0;
    const errors: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < command.proposals.length; i++) {
      const proposal = command.proposals[i];

      const itemCommand: CreateChangeProposalCommand<ChangeProposalType> = {
        userId: command.userId,
        organizationId: command.organizationId,
        spaceId: command.spaceId,
        type: proposal.type,
        artefactId: proposal.artefactId,
        payload: proposal.payload,
        captureMode: proposal.captureMode,
      };

      try {
        await this.playbookChangeManagementPort.createChangeProposal(
          itemCommand,
        );
        created++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ index: i, message });
      }
    }

    this.logger.info('Batch change proposals processed', {
      spaceId: command.spaceId,
      created,
      errors: errors.length,
    });

    return { created, skipped: 0, errors };
  }
}
