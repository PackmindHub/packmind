import { OrganizationId, UserId } from '@packmind/types';
import {
  IRecipesPort,
  Recipe,
  RecipeVersion,
  RecipeVersionId,
  SpaceId,
} from '@packmind/shared';
import { RecipesHexa } from '@packmind/recipes';

export class RecipesAdapter implements Partial<IRecipesPort> {
  constructor(private readonly recipesHexa: RecipesHexa) {}

  async listRecipesByOrganization(
    organizationId: OrganizationId,
  ): Promise<Recipe[]> {
    return this.recipesHexa.listRecipesByOrganization(organizationId);
  }

  async listRecipesBySpace(command: {
    spaceId: SpaceId;
    organizationId: OrganizationId;
    userId: UserId;
  }): Promise<Recipe[]> {
    return this.recipesHexa.listRecipesBySpace(command);
  }

  async getRecipeVersionById(
    id: RecipeVersionId,
  ): Promise<RecipeVersion | null> {
    return this.recipesHexa.getRecipeVersionById(id);
  }
}
