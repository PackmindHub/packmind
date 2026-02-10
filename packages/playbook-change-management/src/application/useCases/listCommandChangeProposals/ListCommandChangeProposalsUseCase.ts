import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';

const origin = 'ListCommandChangeProposalsUseCase';

export class ListCommandChangeProposalsUseCase extends AbstractMemberUseCase<
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly service: ChangeProposalService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: ListCommandChangeProposalsCommand & MemberContext,
  ): Promise<ListCommandChangeProposalsResponse> {
    return this.service.listProposalsByRecipeId(command.recipeId);
  }
}
