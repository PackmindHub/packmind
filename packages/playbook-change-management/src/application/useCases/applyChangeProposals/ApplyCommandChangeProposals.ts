import { AbstractApplyChangeProposals } from './AbstractApplyChangeProposals';
import {
  ChangeProposal,
  ChangeProposalType,
  IRecipesPort,
  OrganizationId,
  RecipeVersion,
  SpaceId,
  UserId,
} from '@packmind/types';
import { isExpectedChangeProposalType } from '../../utils/isExpectedChangeProposalType';
import { DiffService } from '../../services/DiffService';
import { ChangeProposalConflictError } from '../../../domain/errors';

export class ApplyCommandChangeProposals extends AbstractApplyChangeProposals<RecipeVersion> {
  constructor(
    diffService: DiffService,
    private recipesPort: IRecipesPort,
  ) {
    super(diffService);
  }

  protected applyChangeProposal(
    source: RecipeVersion,
    changeProposal: ChangeProposal,
  ): RecipeVersion {
    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateCommandName,
      )
    ) {
      return {
        ...source,
        name: changeProposal.payload.newValue,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateCommandDescription,
      )
    ) {
      return {
        ...source,
        content: this.applyDiff(
          changeProposal.id,
          changeProposal.payload,
          source.content,
        ),
      };
    }
    throw new Error('Method not implemented.');
  }

  async saveNewVersion(
    version: RecipeVersion,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<RecipeVersion> {
    const updateResult = await this.recipesPort.updateRecipeFromUI({
      name: version.name,
      content: version.content,
      recipeId: version.recipeId,
      userId,
      spaceId,
      organizationId,
    });

    const newVersion = await this.recipesPort.getRecipeVersion(
      updateResult.recipe.id,
      updateResult.recipe.version,
    );

    if (!newVersion) {
      throw new Error(
        `Failed to retrieve recipe version ${updateResult.recipe.version} for recipe ${updateResult.recipe.id}`,
      );
    }

    return newVersion;
  }
}
