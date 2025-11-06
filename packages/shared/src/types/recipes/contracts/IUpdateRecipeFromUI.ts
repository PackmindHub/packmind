import { OrganizationId, UserId } from '@packmind/types';
import { SpaceId } from '../../spaces';
import { RecipeId, Recipe } from '../Recipe';

export interface UpdateRecipeFromUICommand {
  recipeId: RecipeId;
  spaceId: SpaceId;
  organizationId: OrganizationId;
  name: string;
  content: string;
  editorUserId: UserId;
}

export interface UpdateRecipeFromUIResponse {
  recipe: Recipe;
}
