import { CommandChangeProposalApplier, DiffService } from '@packmind/types';
import {
  IRecipesPort,
  OrganizationId,
  RecipeId,
  RecipeVersion,
  SpaceId,
  UserId,
} from '@packmind/types';
import { IChangesProposalApplier } from './IChangesProposalApplier';

export class CommandChangesApplier
  extends CommandChangeProposalApplier
  implements IChangesProposalApplier<RecipeVersion>
{
  constructor(
    diffService: DiffService,
    private readonly recipesPort: IRecipesPort,
  ) {
    super(diffService);
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
