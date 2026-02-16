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
    let skipped = 0;
    const errors: Array<{ index: number; message: string; code?: string }> = [];

    for (let i = 0; i < command.proposals.length; i++) {
      const proposal = command.proposals[i];

      const itemCommand = {
        userId: command.userId,
        organizationId: command.organizationId,
        spaceId: command.spaceId,
        type: proposal.type,
        artefactId: proposal.artefactId,
        payload: proposal.payload,
        captureMode: proposal.captureMode,
      } as CreateChangeProposalCommand<ChangeProposalType>;

      try {
        const result =
          await this.playbookChangeManagementPort.createChangeProposal(
            itemCommand,
          );
        if (result.wasCreated) {
          created++;
        } else {
          skipped++;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const code = error instanceof Error ? error.name : undefined;
        this.logger.error('Failed to create change proposal', {
          index: i,
          type: proposal.type,
          artefactId: proposal.artefactId,
          error: message,
        });
        errors.push({ index: i, message, code });
      }
    }

    this.logger.info('Batch change proposals processed', {
      spaceId: command.spaceId,
      created,
      skipped,
      errors: errors.length,
    });

    return { created, skipped, errors };
  }
}
