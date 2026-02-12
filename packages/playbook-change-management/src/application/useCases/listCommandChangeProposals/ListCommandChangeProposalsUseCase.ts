import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IRecipesPort,
  ISpacesPort,
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse,
  RecipeId,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { validateSpaceOwnership } from '../../services/validateSpaceOwnership';

const origin = 'ListCommandChangeProposalsUseCase';

export class ListCommandChangeProposalsUseCase extends AbstractMemberUseCase<
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse
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
    command: ListCommandChangeProposalsCommand & MemberContext,
  ): Promise<ListCommandChangeProposalsResponse> {
    await validateSpaceOwnership(
      this.spacesPort,
      command.spaceId,
      command.organization.id,
    );

    const recipe = await this.recipesPort.getRecipeByIdInternal(
      command.recipeId as RecipeId,
    );

    const currentRecipe = recipe
      ? { name: recipe.name, content: recipe.content }
      : undefined;

    return this.service.listProposalsByArtefactId(
      command.recipeId,
      currentRecipe,
    );
  }
}
