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
import { validateSpaceOwnership } from '../../services/validateSpaceOwnership';
import { findPendingById } from '../findPendingById';

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
    await validateSpaceOwnership(
      this.spacesPort,
      command.spaceId,
      command.organization.id,
    );

    const proposal = await findPendingById(
      this.service,
      command.changeProposalId,
    );

    const recipe = await this.recipesPort.getRecipeByIdInternal(
      command.recipeId as RecipeId,
    );
    if (!recipe) {
      throw new Error(`Recipe ${command.recipeId} not found`);
    }

    const { appliedProposal, updatedFields } = await this.service.applyProposal(
      proposal,
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

    return { changeProposal: appliedProposal };
  }
}
