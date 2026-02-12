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
import { ChangeProposalPayloadMismatchError } from '../../errors/ChangeProposalPayloadMismatchError';
import { UnsupportedChangeProposalTypeError } from '../../errors/UnsupportedChangeProposalTypeError';

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
    let created = 0;
    const errors: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < command.proposals.length; i++) {
      const item = command.proposals[i];

      const itemCommand: CreateChangeProposalCommand<ChangeProposalType> = {
        userId: command.userId,
        organizationId: command.organizationId,
        spaceId: command.spaceId,
        type: item.type,
        artefactId: item.artefactId,
        payload: item.payload,
        captureMode: item.captureMode,
      };

      try {
        await this.playbookChangeManagementPort.createChangeProposal(
          itemCommand,
        );
        created++;
      } catch (error) {
        if (
          error instanceof UnsupportedChangeProposalTypeError ||
          error instanceof ChangeProposalPayloadMismatchError ||
          error instanceof Error
        ) {
          errors.push({ index: i, message: error.message });
        } else {
          errors.push({ index: i, message: String(error) });
        }
      }
    }

    return { created, skipped: 0, errors };
  }
}
