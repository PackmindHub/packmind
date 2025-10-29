import {
  IRecipesPort,
  Recipe,
  RecipeVersion,
  RecipeVersionId,
  OrganizationId,
  SpaceId,
  UserId,
} from '@packmind/shared';
import { RecipesHexa } from '@packmind/recipes';

export class RecipesAdapter implements IRecipesPort {
  constructor(private readonly recipesHexa: RecipesHexa) {}

  async listRecipesByOrganization(
    organizationId: OrganizationId,
  ): Promise<Recipe[]> {
    return this.recipesHexa.listRecipesByOrganization(organizationId);
  }

  async listRecipesBySpace(
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Recipe[]> {
    const result = await this.recipesHexa.listRecipesBySpace({
      userId,
      organizationId,
      spaceId,
    });
    return result;
  }

  async getRecipeVersionById(
    id: RecipeVersionId,
  ): Promise<RecipeVersion | null> {
    return this.recipesHexa.getRecipeVersionById(id);
  }
}
