import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  ApplyCommandChangeProposalCommand,
  ApplyCommandChangeProposalResponse,
  IAccountsPort,
  IRecipesPort,
  ISpacesPort,
  RecipeId,
  SpaceId,
  UserId,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';

const origin = 'ApplyCommandChangeProposalUseCase';

export class ApplyCommandChangeProposalUseCase extends AbstractMemberUseCase<
  ApplyCommandChangeProposalCommand,
  ApplyCommandChangeProposalResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly recipesPort: IRecipesPort,
    private readonly service: ChangeProposalService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: ApplyCommandChangeProposalCommand & MemberContext,
  ): Promise<ApplyCommandChangeProposalResponse> {
    const space = await this.spacesPort.getSpaceById(command.spaceId);
    if (!space) {
      throw new Error(`Space ${command.spaceId} not found`);
    }
    if (space.organizationId !== command.organization.id) {
      throw new Error(
        `Space ${command.spaceId} does not belong to organization ${command.organization.id}`,
      );
    }

    const recipe = await this.recipesPort.getRecipeByIdInternal(
      command.recipeId as RecipeId,
    );
    if (!recipe) {
      throw new Error(`Recipe ${command.recipeId} not found`);
    }

    const { changeProposal, updatedFields } = await this.service.applyProposal(
      command.recipeId,
      command.changeProposalId,
      command.userId as UserId,
      { name: recipe.name, content: recipe.content },
      command.force,
    );

    await this.recipesPort.updateRecipeFromUI({
      recipeId: recipe.id,
      name: updatedFields.name,
      content: updatedFields.content,
      userId: command.userId as UserId,
      spaceId: command.spaceId as SpaceId,
      organizationId: command.organization.id,
    });

    return { changeProposal };
  }
}
