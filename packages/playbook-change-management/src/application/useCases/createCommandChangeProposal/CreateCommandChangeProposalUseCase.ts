import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  CreateCommandChangeProposalCommand,
  CreateCommandChangeProposalResponse,
  IAccountsPort,
  ICreateCommandChangeProposalUseCase,
  ISpacesPort,
  SpaceId,
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
    private readonly spacesPort: ISpacesPort,
    private readonly service: ChangeProposalService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: CreateCommandChangeProposalCommand & MemberContext,
  ): Promise<CreateCommandChangeProposalResponse> {
    const spaceId = command.spaceId as SpaceId;

    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space) {
      throw new Error(`Space ${spaceId} not found`);
    }
    if (space.organizationId !== command.organization.id) {
      throw new Error(
        `Space ${spaceId} does not belong to organization ${command.organization.id}`,
      );
    }

    return this.service.createProposal(command);
  }
}
