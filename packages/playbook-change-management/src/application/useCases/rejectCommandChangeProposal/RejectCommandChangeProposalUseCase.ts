import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  ISpacesPort,
  RejectCommandChangeProposalCommand,
  RejectCommandChangeProposalResponse,
  UserId,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { validateSpaceOwnership } from '../../services/validateSpaceOwnership';
import { findPendingById } from '../findPendingById';

const origin = 'RejectCommandChangeProposalUseCase';

export class RejectCommandChangeProposalUseCase extends AbstractMemberUseCase<
  RejectCommandChangeProposalCommand,
  RejectCommandChangeProposalResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly service: ChangeProposalService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: RejectCommandChangeProposalCommand & MemberContext,
  ): Promise<RejectCommandChangeProposalResponse> {
    await validateSpaceOwnership(
      this.spacesPort,
      command.spaceId,
      command.organization.id,
    );

    const proposal = await findPendingById(
      this.service,
      command.changeProposalId,
    );

    const rejectedProposal = await this.service.rejectProposal(
      proposal,
      command.userId as UserId,
    );

    return { changeProposal: rejectedProposal };
  }
}
