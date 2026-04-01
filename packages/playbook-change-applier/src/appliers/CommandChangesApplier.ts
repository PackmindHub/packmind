import {
  CommandChangeProposalApplier,
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
    diffService: ConstructorParameters<typeof CommandChangeProposalApplier>[0],
    private readonly recipesPort: IRecipesPort,
  ) {
    super(diffService);
  }

  async getVersion(artefactId: string): Promise<RecipeVersion> {
    const recipeId = artefactId as RecipeId;
    const recipe = await this.recipesPort.getRecipeByIdInternal(recipeId);
    if (!recipe) {
      throw new Error(`Recipe not found for ${artefactId}`);
    }
    const version = await this.recipesPort.getRecipeVersion(
      recipe.id,
      recipe.version,
      [recipe.spaceId],
    );
    if (!version) {
      throw new Error(`Recipe version not found for ${artefactId}`);
    }
    return version;
  }

  async saveNewVersion(
    version: RecipeVersion,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<RecipeVersion> {
    const result = await this.recipesPort.updateRecipeFromUI({
      recipeId: version.recipeId,
      name: version.name,
      content: version.content,
      userId,
      spaceId,
      organizationId,
    });
    const newVersion = await this.recipesPort.getRecipeVersion(
      result.recipe.id,
      result.recipe.version,
      [result.recipe.spaceId],
    );
    if (!newVersion) {
      throw new Error(
        `Failed to retrieve new version after updating recipe ${version.recipeId}`,
      );
    }
    return newVersion;
  }
}
