import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  ISpacesPort,
  RejectCommandChangeProposalCommand,
  RejectCommandChangeProposalResponse,
  SpaceId,
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
    private readonly spacesPort: ISpacesPort,
    private readonly service: ChangeProposalService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: RejectCommandChangeProposalCommand & MemberContext,
  ): Promise<RejectCommandChangeProposalResponse> {
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

    return this.service.rejectProposal(
      command.recipeId,
      command.changeProposalId,
      command.userId as UserId,
    );
  }
}
