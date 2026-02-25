import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  CheckChangeProposalsCommand,
  CheckChangeProposalsResponse,
  ChangeProposalType,
  IAccountsPort,
  createUserId,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';

const origin = 'CheckChangeProposalsUseCase';

export class CheckChangeProposalsUseCase extends AbstractMemberUseCase<
  CheckChangeProposalsCommand,
  CheckChangeProposalsResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly changeProposalService: ChangeProposalService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: CheckChangeProposalsCommand & MemberContext,
  ): Promise<CheckChangeProposalsResponse> {
    this.logger.info('Checking existing change proposals', {
      spaceId: command.spaceId,
      count: command.proposals.length,
    });

    const results = await Promise.all(
      command.proposals.map(async (proposal, index) => {
        const existing = await this.changeProposalService.findExistingPending(
          command.spaceId,
          createUserId(command.userId),
          proposal.artefactId,
          proposal.type as ChangeProposalType,
          proposal.payload,
        );

        return {
          index,
          exists: existing !== null,
          createdAt: existing?.createdAt.toISOString() ?? null,
        };
      }),
    );

    this.logger.info('Change proposals check completed', {
      spaceId: command.spaceId,
      total: command.proposals.length,
      existing: results.filter((r) => r.exists).length,
    });

    return { results };
  }
}
