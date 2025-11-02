import { RecipeId, Recipe } from '../Recipe';
import { UserId } from '../../accounts';

export interface UpdateRecipeFromUICommand {
  recipeId: RecipeId;
  name: string;
  content: string;
  editorUserId: UserId;
}

export interface UpdateRecipeFromUIResponse {
  recipe: Recipe;
}
