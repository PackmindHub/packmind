import { RecipesHexa } from '@packmind/recipes';
import {
  IRecipesPort,
  OrganizationId,
  Recipe,
  RecipeVersion,
  RecipeVersionId,
  SpaceId,
  UserId,
} from '@packmind/types';

export class RecipesAdapter implements Partial<IRecipesPort> {
  constructor(private readonly recipesHexa: RecipesHexa) {}

  async listRecipesByOrganization(
    organizationId: OrganizationId,
  ): Promise<Recipe[]> {
    return this.recipesHexa
      .getAdapter()
      .listRecipesByOrganization(organizationId);
  }

  async listRecipesBySpace(command: {
    spaceId: SpaceId;
    organizationId: OrganizationId;
    userId: UserId;
  }): Promise<Recipe[]> {
    return this.recipesHexa.getAdapter().listRecipesBySpace(command);
  }

  async getRecipeVersionById(
    id: RecipeVersionId,
  ): Promise<RecipeVersion | null> {
    return this.recipesHexa.getAdapter().getRecipeVersionById(id);
  }
}
