import { Recipe, RecipeVersion, RecipeVersionId } from '../recipes';
import { OrganizationId, UserId } from '../accounts';
import { SpaceId } from '../spaces';

export interface IRecipesPort {
  listRecipesByOrganization(organizationId: OrganizationId): Promise<Recipe[]>;
  listRecipesBySpace(
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Recipe[]>;
  getRecipeVersionById(id: RecipeVersionId): Promise<RecipeVersion | null>;
}
