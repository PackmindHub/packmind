import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  IListChangeProposalsByArtefact,
  ListChangeProposalsByArtefactCommand,
  ListChangeProposalsByArtefactResponse,
  RecipeId,
  SkillId,
  StandardId,
  ChangeProposalStatus,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { ConflictDetectionService } from '../../services/ConflictDetectionService';
import { validateArtefactInSpace } from '../../services/validateArtefactInSpace';
import { validateSpaceOwnership } from '../../services/validateSpaceOwnership';

const origin = 'ListChangeProposalsByArtefactUseCase';

export class ListChangeProposalsByArtefactUseCase<
  T extends StandardId | RecipeId | SkillId,
>
  extends AbstractMemberUseCase<
    ListChangeProposalsByArtefactCommand<T>,
    ListChangeProposalsByArtefactResponse
  >
  implements IListChangeProposalsByArtefact<T>
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly skillsPort: ISkillsPort,
    private readonly service: ChangeProposalService,
    private readonly conflictDetectionService: ConflictDetectionService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: ListChangeProposalsByArtefactCommand<T> & MemberContext,
  ): Promise<ListChangeProposalsByArtefactResponse> {
    await validateSpaceOwnership(
      this.spacesPort,
      command.spaceId,
      command.organization.id,
    );

    await validateArtefactInSpace(
      command.artefactId,
      command.spaceId,
      this.standardsPort,
      this.recipesPort,
      this.skillsPort,
    );

    const allProposals = await this.service.findProposalsByArtefact(
      command.spaceId,
      command.artefactId,
    );

    const proposalsToReturn =
      command.pendingOnly === false
        ? allProposals
        : allProposals.filter((p) => p.status === ChangeProposalStatus.pending);

    const changeProposals =
      this.conflictDetectionService.detectConflicts(proposalsToReturn);

    return { changeProposals };
  }
}
