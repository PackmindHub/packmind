import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IDeploymentPort,
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
import { ArtefactNotFoundError } from '../../../domain/errors/ArtefactNotFoundError';
import { ArtefactNotInSpaceError } from '../../../domain/errors/ArtefactNotInSpaceError';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { ConflictDetectionService } from '../../services/ConflictDetectionService';
import {
  ArtefactType,
  validateArtefactInSpace,
} from '../../services/validateArtefactInSpace';

const origin = 'ListChangeProposalsByArtefactUseCase';

export class ListChangeProposalsByArtefactUseCase<
  T extends StandardId | RecipeId | SkillId,
>
  extends AbstractSpaceMemberUseCase<
    ListChangeProposalsByArtefactCommand<T>,
    ListChangeProposalsByArtefactResponse
  >
  implements IListChangeProposalsByArtefact<T>
{
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly skillsPort: ISkillsPort,
    private readonly deploymentPort: IDeploymentPort,
    private readonly service: ChangeProposalService,
    private readonly conflictDetectionService: ConflictDetectionService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsPort, logger);
  }

  async executeForSpaceMembers(
    command: ListChangeProposalsByArtefactCommand<T> & SpaceMemberContext,
  ): Promise<ListChangeProposalsByArtefactResponse> {
    let artefactType: ArtefactType;
    try {
      artefactType = await validateArtefactInSpace(
        command.artefactId,
        command.spaceId,
        this.standardsPort,
        this.recipesPort,
        this.skillsPort,
      );
    } catch (error) {
      if (
        error instanceof ArtefactNotFoundError ||
        error instanceof ArtefactNotInSpaceError
      ) {
        this.logger.warn(error.message);
        return { changeProposals: [], currentPackageIds: [] };
      }
      throw error;
    }

    const [allProposals, { packages }] = await Promise.all([
      this.service.findProposalsByArtefact(command.spaceId, command.artefactId),
      this.deploymentPort.listPackagesBySpace({
        spaceId: command.spaceId,
        organizationId: command.organization.id,
        userId: command.userId,
      }),
    ]);

    const currentPackageIds = packages
      .filter((pkg) => {
        if (artefactType === 'standard')
          return pkg.standards.includes(command.artefactId as StandardId);
        if (artefactType === 'recipe')
          return pkg.recipes.includes(command.artefactId as RecipeId);
        return pkg.skills.includes(command.artefactId as SkillId);
      })
      .map((pkg) => pkg.id);

    const proposalsToReturn =
      command.pendingOnly === false
        ? allProposals
        : allProposals.filter((p) => p.status === ChangeProposalStatus.pending);

    const changeProposals =
      this.conflictDetectionService.detectConflicts(proposalsToReturn);

    return { changeProposals, currentPackageIds };
  }
}
