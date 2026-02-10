import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  CreateCommandChangeProposalCommand,
  CreateCommandChangeProposalResponse,
  IAccountsPort,
  ICreateCommandChangeProposalUseCase,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';

const origin = 'CreateCommandChangeProposalUseCase';

export class CreateCommandChangeProposalUseCase
  extends AbstractMemberUseCase<
    CreateCommandChangeProposalCommand,
    CreateCommandChangeProposalResponse
  >
  implements ICreateCommandChangeProposalUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly service: ChangeProposalService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: CreateCommandChangeProposalCommand & MemberContext,
  ): Promise<CreateCommandChangeProposalResponse> {
    return this.service.createProposal(command);
  }
}
