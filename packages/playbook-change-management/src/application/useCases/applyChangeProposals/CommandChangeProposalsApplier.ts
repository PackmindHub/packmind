import { AbstractChangeProposalsApplier } from './AbstractChangeProposalsApplier';
import {
  ChangeProposal,
  ChangeProposalType,
  IRecipesPort,
  OrganizationId,
  RecipeId,
  RecipeVersion,
  SpaceId,
  UserId,
} from '@packmind/types';
import { isExpectedChangeProposalType } from '../../utils/isExpectedChangeProposalType';
import { DiffService } from '../../services/DiffService';

const RECIPE_CHANGE_TYPES = [
  ChangeProposalType.updateCommandName,
  ChangeProposalType.updateCommandDescription,
];

export class CommandChangeProposalsApplier extends AbstractChangeProposalsApplier<RecipeVersion> {
  constructor(
    diffService: DiffService,
    private recipesPort: IRecipesPort,
  ) {
    super(diffService);
  }

  areChangesApplicable(changeProposals: ChangeProposal[]): boolean {
    return this.checkChangesApplicable(changeProposals, RECIPE_CHANGE_TYPES);
  }

  async getVersion(artefactId: RecipeId): Promise<RecipeVersion> {
    const recipe = await this.recipesPort.getRecipeByIdInternal(artefactId);
    if (!recipe) {
      throw new Error(`Unable to find recipe matching id ${artefactId}`);
    }

    const recipeVersion = await this.recipesPort.getRecipeVersion(
      recipe.id,
      recipe.version,
    );
    if (!recipeVersion) {
      throw new Error(
        `Unable to find recipeVersion #${recipe.version} for recipe ${artefactId}`,
      );
    }

    return recipeVersion;
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
    console.log('Save new version', version);

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
