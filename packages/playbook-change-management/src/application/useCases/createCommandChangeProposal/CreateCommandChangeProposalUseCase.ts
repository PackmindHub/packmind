import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  CreateCommandChangeProposalCommand,
  CreateCommandChangeProposalResponse,
  createUserId,
  IAccountsPort,
  ICreateCommandChangeProposalUseCase,
  ISpacesPort,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { validateSpaceOwnership } from '../../services/validateSpaceOwnership';

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
    private readonly spacesPort: ISpacesPort,
    private readonly service: ChangeProposalService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: CreateCommandChangeProposalCommand & MemberContext,
  ): Promise<CreateCommandChangeProposalResponse> {
    await validateSpaceOwnership(
      this.spacesPort,
      command.spaceId,
      command.organization.id,
    );

    const existing = await this.service.findExistingPending(
      command.spaceId,
      createUserId(command.userId),
      command.artefactId,
      command.type,
      command.payload,
    );

    if (existing) {
      return { changeProposal: existing, wasCreated: false };
    }

    const { changeProposal } = await this.service.createProposal(command);

    return { changeProposal, wasCreated: true };
  }
}
