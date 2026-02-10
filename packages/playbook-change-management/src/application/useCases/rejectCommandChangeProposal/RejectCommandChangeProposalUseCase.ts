import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  RejectCommandChangeProposalCommand,
  RejectCommandChangeProposalResponse,
  UserId,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';

const origin = 'RejectCommandChangeProposalUseCase';

export class RejectCommandChangeProposalUseCase extends AbstractMemberUseCase<
  RejectCommandChangeProposalCommand,
  RejectCommandChangeProposalResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly service: ChangeProposalService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: RejectCommandChangeProposalCommand & MemberContext,
  ): Promise<RejectCommandChangeProposalResponse> {
    return this.service.rejectProposal(
      command.recipeId,
      command.changeProposalId,
      command.userId as UserId,
    );
  }
}
