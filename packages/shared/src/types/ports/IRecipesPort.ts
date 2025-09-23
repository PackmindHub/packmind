import { Recipe, RecipeVersion, RecipeVersionId } from '../recipes';
import { OrganizationId } from '../accounts';

export interface IRecipesPort {
  listRecipesByOrganization(organizationId: OrganizationId): Promise<Recipe[]>;
  getRecipeVersionById(id: RecipeVersionId): Promise<RecipeVersion | null>;
}
