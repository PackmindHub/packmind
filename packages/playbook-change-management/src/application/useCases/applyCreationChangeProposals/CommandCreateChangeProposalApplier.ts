import {
  CreatedIds,
  ICreateChangeProposalApplier,
} from './ICreateChangeProposalApplier';
import {
  ChangeProposal,
  ChangeProposalType,
  IRecipesPort,
  OrganizationId,
  Recipe,
  SpaceId,
} from '@packmind/types';

export class CommandCreateChangeProposalApplier implements ICreateChangeProposalApplier<ChangeProposalType.createCommand> {
  constructor(private readonly recipesPort: IRecipesPort) {}

  apply(
    changeProposal: ChangeProposal<ChangeProposalType.createCommand>,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<Recipe> {
    return this.recipesPort.captureRecipe({
      userId: changeProposal.createdBy,
      organizationId,
      spaceId,
      name: changeProposal.payload.name,
      content: changeProposal.payload.content,
    });
  }

  updateCreatedIds(createdIds: CreatedIds, artefact: Recipe): CreatedIds {
    return {
      ...createdIds,
      commands: [...createdIds.commands, artefact.id],
    };
  }
}
