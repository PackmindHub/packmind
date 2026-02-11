import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  ISpacesPort,
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse,
  SpaceId,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';

const origin = 'ListCommandChangeProposalsUseCase';

export class ListCommandChangeProposalsUseCase extends AbstractMemberUseCase<
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse
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
    command: ListCommandChangeProposalsCommand & MemberContext,
  ): Promise<ListCommandChangeProposalsResponse> {
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

    return this.service.listProposalsByArtefactId(command.recipeId);
  }
}
