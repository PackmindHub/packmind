import {
  IRecipesPort,
  Recipe,
  RecipeVersion,
  RecipeVersionId,
  OrganizationId,
} from '@packmind/shared';
import { RecipesHexa } from '@packmind/recipes';

export class RecipesAdapter implements IRecipesPort {
  constructor(private readonly recipesHexa: RecipesHexa) {}

  async listRecipesByOrganization(
    organizationId: OrganizationId,
  ): Promise<Recipe[]> {
    return this.recipesHexa.listRecipesByOrganization(organizationId);
  }

  async getRecipeVersionById(
    id: RecipeVersionId,
  ): Promise<RecipeVersion | null> {
    return this.recipesHexa.getRecipeVersionById(id);
  }
}
