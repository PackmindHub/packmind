import { OrganizationId, UserId } from '@packmind/types';
import {
  IRecipesPort,
  Recipe,
  RecipeVersion,
  RecipeVersionId,
} from '@packmind/types';
import { SpaceId } from '@packmind/types';
import { RecipesHexa } from '@packmind/recipes';

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
